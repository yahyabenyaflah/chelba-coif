import "server-only";

import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";

import { getDb, getSql, schema } from "@/lib/db";
import {
  computeSlots,
  type ClosureRange,
  type OpeningRule,
  type Slot,
} from "@/lib/booking/slots";
import { addDaysToKey, type DayKey, todayKey } from "@/lib/time";

/**
 * Lectures de la base. Aucune écriture ici : les mutations vivent dans les
 * fichiers `actions.ts`, qui vérifient l'identité avant d'agir.
 */

export async function getSettings() {
  const rows = await getDb()
    .select()
    .from(schema.salonSettings)
    .where(eq(schema.salonSettings.id, 1))
    .limit(1);

  const settings = rows[0];
  if (!settings) {
    throw new Error(
      "Réglages du salon introuvables. La migration `drizzle/0001_init.sql` a-t-elle été exécutée ?",
    );
  }
  return settings;
}

export async function getActiveServices() {
  return getDb()
    .select()
    .from(schema.services)
    .where(eq(schema.services.isActive, true))
    .orderBy(asc(schema.services.sortOrder), asc(schema.services.name));
}

export async function getAllServices() {
  return getDb()
    .select()
    .from(schema.services)
    .orderBy(asc(schema.services.sortOrder), asc(schema.services.name));
}

export async function getServiceById(id: string) {
  const rows = await getDb()
    .select()
    .from(schema.services)
    .where(eq(schema.services.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getGallery(opts: { includeHidden?: boolean } = {}) {
  const db = getDb();
  const query = db
    .select({
      id: schema.haircutStyles.id,
      title: schema.haircutStyles.title,
      description: schema.haircutStyles.description,
      cloudinaryPublicId: schema.haircutStyles.cloudinaryPublicId,
      width: schema.haircutStyles.width,
      height: schema.haircutStyles.height,
      isFeatured: schema.haircutStyles.isFeatured,
      isActive: schema.haircutStyles.isActive,
      sortOrder: schema.haircutStyles.sortOrder,
      serviceId: schema.haircutStyles.serviceId,
      serviceName: schema.services.name,
    })
    .from(schema.haircutStyles)
    .leftJoin(schema.services, eq(schema.haircutStyles.serviceId, schema.services.id))
    .orderBy(
      desc(schema.haircutStyles.isFeatured),
      asc(schema.haircutStyles.sortOrder),
      desc(schema.haircutStyles.createdAt),
    );

  return opts.includeHidden
    ? query
    : query.where(eq(schema.haircutStyles.isActive, true));
}

export async function getOpeningRules(): Promise<OpeningRule[]> {
  const rows = await getDb()
    .select()
    .from(schema.openingHours)
    .orderBy(asc(schema.openingHours.weekday));

  return rows.map((r) => ({
    weekday: r.weekday,
    isClosed: r.isClosed,
    opensAt: r.opensAt,
    closesAt: r.closesAt,
    breakStart: r.breakStart,
    breakEnd: r.breakEnd,
  }));
}

/** Fermetures à venir uniquement : l'historique n'influence aucun calcul. */
export async function getUpcomingClosures(from: DayKey = todayKey()): Promise<ClosureRange[]> {
  const rows = await getDb()
    .select({ startDate: schema.closures.startDate, endDate: schema.closures.endDate })
    .from(schema.closures)
    .where(gte(schema.closures.endDate, from))
    .orderBy(asc(schema.closures.startDate));
  return rows;
}

export async function getAllClosures() {
  return getDb().select().from(schema.closures).orderBy(desc(schema.closures.startDate));
}

/** Rendez-vous occupant le planning sur un intervalle (annulés exclus). */
async function getBusyRanges(fromInstant: Date, toInstant: Date) {
  return getDb()
    .select({ startsAt: schema.bookings.startsAt, endsAt: schema.bookings.endsAt })
    .from(schema.bookings)
    .where(
      and(
        gte(schema.bookings.startsAt, fromInstant),
        lt(schema.bookings.startsAt, toInstant),
        inArray(schema.bookings.status, ["pending", "confirmed", "completed"]),
      ),
    );
}

export type DayAvailability = {
  day: DayKey;
  slots: Slot[];
  /** Vrai si le salon est ouvert ce jour-là, même si tout est déjà pris. */
  isOpen: boolean;
  freeCount: number;
};

/**
 * Disponibilités sur une fenêtre de jours pour une prestation donnée.
 *
 * Toutes les réservations de la fenêtre sont chargées en une requête plutôt
 * qu'une par jour : sur 30 jours, la différence est de 1 aller-retour contre 30.
 */
export async function getAvailability(params: {
  serviceDurationMin: number;
  fromDay?: DayKey;
  days: number;
  now?: Date;
}): Promise<DayAvailability[]> {
  const now = params.now ?? new Date();
  const fromDay = params.fromDay ?? todayKey(now);
  const toDayExclusive = addDaysToKey(fromDay, params.days);

  const [settings, rules, closures] = await Promise.all([
    getSettings(),
    getOpeningRules(),
    getUpcomingClosures(fromDay),
  ]);

  // Bornes larges d'un jour de chaque côté : couvre les décalages de fuseau.
  const busy = await getBusyRanges(
    new Date(`${addDaysToKey(fromDay, -1)}T00:00:00Z`),
    new Date(`${addDaysToKey(toDayExclusive, 1)}T00:00:00Z`),
  );

  const out: DayAvailability[] = [];
  for (let i = 0; i < params.days; i++) {
    const day = addDaysToKey(fromDay, i);
    const slots = computeSlots({
      day,
      rules,
      closures,
      busy,
      serviceDurationMin: params.serviceDurationMin,
      slotIntervalMin: settings.slotIntervalMin,
      minAdvanceMin: settings.minAdvanceMin,
      now,
    });
    out.push({
      day,
      slots,
      isOpen: slots.length > 0,
      freeCount: slots.filter((s) => s.available).length,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Réservations
// ---------------------------------------------------------------------------

const bookingColumns = {
  id: schema.bookings.id,
  reference: schema.bookings.reference,
  contactName: schema.bookings.contactName,
  contactPhone: schema.bookings.contactPhone,
  startsAt: schema.bookings.startsAt,
  endsAt: schema.bookings.endsAt,
  status: schema.bookings.status,
  priceMillimes: schema.bookings.priceMillimes,
  notes: schema.bookings.notes,
  adminNotes: schema.bookings.adminNotes,
  createdAt: schema.bookings.createdAt,
  customerId: schema.bookings.customerId,
  serviceId: schema.bookings.serviceId,
  serviceName: schema.services.name,
  serviceDuration: schema.services.durationMin,
};

/** Dérivé d'une requête réelle : reste juste si `bookingColumns` évolue. */
export type BookingRow = Awaited<ReturnType<typeof getUpcomingBookings>>[number];

/**
 * Consultation sans compte : le numéro de téléphone suffit à retrouver les
 * réservations qui lui sont associées (celles faites avec ce numéro, avec ou
 * sans compte client). Peut renvoyer plusieurs lignes — un même numéro peut
 * avoir plusieurs rendez-vous.
 */
export async function findBookingsByPhone(phone: string) {
  return getDb()
    .select(bookingColumns)
    .from(schema.bookings)
    .innerJoin(schema.services, eq(schema.bookings.serviceId, schema.services.id))
    .where(eq(schema.bookings.contactPhone, phone))
    .orderBy(desc(schema.bookings.startsAt))
    .limit(20);
}

export async function getCustomerBookings(customerId: string) {
  return getDb()
    .select(bookingColumns)
    .from(schema.bookings)
    .innerJoin(schema.services, eq(schema.bookings.serviceId, schema.services.id))
    .where(eq(schema.bookings.customerId, customerId))
    .orderBy(desc(schema.bookings.startsAt))
    .limit(50);
}

export async function getBookingsBetween(fromInstant: Date, toInstant: Date) {
  return getDb()
    .select(bookingColumns)
    .from(schema.bookings)
    .innerJoin(schema.services, eq(schema.bookings.serviceId, schema.services.id))
    .where(and(gte(schema.bookings.startsAt, fromInstant), lt(schema.bookings.startsAt, toInstant)))
    .orderBy(asc(schema.bookings.startsAt));
}

export async function getUpcomingBookings(limit = 100) {
  return getDb()
    .select(bookingColumns)
    .from(schema.bookings)
    .innerJoin(schema.services, eq(schema.bookings.serviceId, schema.services.id))
    .where(
      and(
        gte(schema.bookings.startsAt, new Date(Date.now() - 6 * 60 * 60 * 1000)),
        inArray(schema.bookings.status, ["pending", "confirmed"]),
      ),
    )
    .orderBy(asc(schema.bookings.startsAt))
    .limit(limit);
}

export async function getBookingById(id: string) {
  const rows = await getDb()
    .select(bookingColumns)
    .from(schema.bookings)
    .innerJoin(schema.services, eq(schema.bookings.serviceId, schema.services.id))
    .where(eq(schema.bookings.id, id))
    .limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Fidélité
// ---------------------------------------------------------------------------

export async function getLoyaltyHistory(customerId: string) {
  return getDb()
    .select({
      id: schema.loyaltyTransactions.id,
      points: schema.loyaltyTransactions.points,
      reason: schema.loyaltyTransactions.reason,
      createdAt: schema.loyaltyTransactions.createdAt,
    })
    .from(schema.loyaltyTransactions)
    .where(eq(schema.loyaltyTransactions.customerId, customerId))
    .orderBy(desc(schema.loyaltyTransactions.createdAt))
    .limit(30);
}

// ---------------------------------------------------------------------------
// Statistiques du dashboard
//
// Écrites en SQL brut : ces agrégats (séries temporelles avec jours vides,
// fréquence de visite par client) s'expriment mal avec le query builder.
// Les valeurs sont toujours interpolées via tagged template, donc paramétrées.
// ---------------------------------------------------------------------------

export type DashboardStats = {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  pendingCount: number;
  monthRevenueMillimes: number;
  newCustomersThisMonth: number;
  cancellationRate: number;
  totalCustomers: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const sqlClient = getSql();
  const rows = (await sqlClient`
    WITH bounds AS (
      SELECT
        date_trunc('day',   now() AT TIME ZONE 'Africa/Tunis') AS day_start,
        date_trunc('week',  now() AT TIME ZONE 'Africa/Tunis') AS week_start,
        date_trunc('month', now() AT TIME ZONE 'Africa/Tunis') AS month_start
    ),
    local AS (
      SELECT status, price_millimes,
             (starts_at AT TIME ZONE 'Africa/Tunis') AS local_start
      FROM bookings
    )
    SELECT
      (SELECT count(*) FROM local, bounds
        WHERE local_start >= bounds.day_start
          AND local_start < bounds.day_start + interval '1 day'
          AND status IN ('pending','confirmed','completed'))::int AS today_count,
      (SELECT count(*) FROM local, bounds
        WHERE local_start >= bounds.week_start
          AND status IN ('pending','confirmed','completed'))::int AS week_count,
      (SELECT count(*) FROM local, bounds
        WHERE local_start >= bounds.month_start
          AND status IN ('pending','confirmed','completed'))::int AS month_count,
      (SELECT count(*) FROM bookings
        WHERE status = 'pending' AND starts_at >= now())::int AS pending_count,
      -- Chiffre d'affaires : uniquement les rendez-vous honorés.
      (SELECT coalesce(sum(price_millimes), 0) FROM local, bounds
        WHERE local_start >= bounds.month_start AND status = 'completed')::int AS month_revenue,
      (SELECT count(*) FROM customers, bounds
        WHERE (created_at AT TIME ZONE 'Africa/Tunis') >= bounds.month_start)::int AS new_customers,
      (SELECT count(*) FROM customers)::int AS total_customers,
      (SELECT count(*) FROM local, bounds
        WHERE local_start >= bounds.month_start
          AND status IN ('cancelled','no_show'))::int AS cancelled_count
  `) as Record<string, number>[];

  const r = rows[0] ?? {};
  const cancelled = r.cancelled_count ?? 0;
  const kept = r.month_count ?? 0;
  const denominator = cancelled + kept;

  return {
    todayCount: r.today_count ?? 0,
    weekCount: r.week_count ?? 0,
    monthCount: kept,
    pendingCount: r.pending_count ?? 0,
    monthRevenueMillimes: r.month_revenue ?? 0,
    newCustomersThisMonth: r.new_customers ?? 0,
    totalCustomers: r.total_customers ?? 0,
    cancellationRate: denominator === 0 ? 0 : cancelled / denominator,
  };
}

export type DailySeriesPoint = { day: string; count: number; revenueMillimes: number };

/** Série journalière sur N jours, jours sans rendez-vous inclus (valeur 0). */
export async function getDailySeries(days = 30): Promise<DailySeriesPoint[]> {
  const rows = (await getSql()`
    WITH span AS (
      SELECT generate_series(
        date_trunc('day', now() AT TIME ZONE 'Africa/Tunis') - make_interval(days => ${days - 1}),
        date_trunc('day', now() AT TIME ZONE 'Africa/Tunis'),
        interval '1 day'
      )::date AS day
    )
    SELECT
      span.day::text AS day,
      count(b.id)::int AS count,
      coalesce(sum(b.price_millimes) FILTER (WHERE b.status = 'completed'), 0)::int AS revenue
    FROM span
    LEFT JOIN bookings b
      ON (b.starts_at AT TIME ZONE 'Africa/Tunis')::date = span.day
     AND b.status IN ('pending','confirmed','completed')
    GROUP BY span.day
    ORDER BY span.day
  `) as { day: string; count: number; revenue: number }[];

  return rows.map((r) => ({ day: r.day, count: r.count, revenueMillimes: r.revenue }));
}

export type ServiceBreakdown = { name: string; count: number; revenueMillimes: number };

export async function getServiceBreakdown(days = 90): Promise<ServiceBreakdown[]> {
  return (await getSql()`
    SELECT s.name,
           count(b.id)::int AS count,
           coalesce(sum(b.price_millimes) FILTER (WHERE b.status = 'completed'), 0)::int AS "revenueMillimes"
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    WHERE b.starts_at >= now() - make_interval(days => ${days})
      AND b.status IN ('pending','confirmed','completed')
    GROUP BY s.name
    ORDER BY count DESC
    LIMIT 10
  `) as ServiceBreakdown[];
}

export type PeakHour = { hour: number; count: number };

/** Heures de pointe : sert au coiffeur à ajuster ses horaires. */
export async function getPeakHours(days = 90): Promise<PeakHour[]> {
  return (await getSql()`
    SELECT extract(hour FROM (starts_at AT TIME ZONE 'Africa/Tunis'))::int AS hour,
           count(*)::int AS count
    FROM bookings
    WHERE starts_at >= now() - make_interval(days => ${days})
      AND status IN ('confirmed','completed')
    GROUP BY hour
    ORDER BY hour
  `) as PeakHour[];
}

export type CustomerStat = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  createdAt: string;
  totalVisits: number;
  visitsLast30d: number;
  /** Moyenne de visites honorées par mois depuis l'inscription. */
  visitsPerMonth: number;
  lastVisit: string | null;
  nextBooking: string | null;
  lifetimeMillimes: number;
};

/**
 * Fiche statistique par client titulaire d'un compte : c'est la vue « qui vient
 * combien de fois par mois » demandée pour le dashboard.
 */
export async function getCustomerStats(): Promise<CustomerStat[]> {
  return (await getSql()`
    SELECT
      c.id,
      c.full_name       AS "fullName",
      c.email,
      c.phone,
      c.loyalty_points  AS "loyaltyPoints",
      c.created_at::text AS "createdAt",
      count(b.id) FILTER (WHERE b.status = 'completed')::int AS "totalVisits",
      count(b.id) FILTER (
        WHERE b.status = 'completed' AND b.starts_at >= now() - interval '30 days'
      )::int AS "visitsLast30d",
      -- Ancienneté plancher d'un mois : sans ça, un client inscrit hier et venu
      -- une fois afficherait une fréquence absurde (30 visites/mois).
      round(
        count(b.id) FILTER (WHERE b.status = 'completed')::numeric
        / greatest(extract(epoch FROM (now() - c.created_at)) / 2592000.0, 1.0)
      , 2)::float8 AS "visitsPerMonth",
      max(b.starts_at) FILTER (WHERE b.status = 'completed')::text AS "lastVisit",
      min(b.starts_at) FILTER (
        WHERE b.status IN ('pending','confirmed') AND b.starts_at >= now()
      )::text AS "nextBooking",
      coalesce(sum(b.price_millimes) FILTER (WHERE b.status = 'completed'), 0)::int AS "lifetimeMillimes"
    FROM customers c
    LEFT JOIN bookings b ON b.customer_id = c.id
    GROUP BY c.id
    ORDER BY "totalVisits" DESC, c.created_at DESC
    LIMIT 200
  `) as CustomerStat[];
}

export type MonthlyVisits = { month: string; visits: number; uniqueCustomers: number };

/** Fréquentation mensuelle sur 12 mois, mois vides inclus. */
export async function getMonthlyVisits(months = 12): Promise<MonthlyVisits[]> {
  return (await getSql()`
    WITH span AS (
      SELECT generate_series(
        date_trunc('month', now() AT TIME ZONE 'Africa/Tunis') - make_interval(months => ${months - 1}),
        date_trunc('month', now() AT TIME ZONE 'Africa/Tunis'),
        interval '1 month'
      ) AS month_start
    )
    SELECT
      to_char(span.month_start, 'YYYY-MM') AS month,
      count(b.id)::int AS visits,
      count(DISTINCT b.customer_id)::int AS "uniqueCustomers"
    FROM span
    LEFT JOIN bookings b
      ON date_trunc('month', b.starts_at AT TIME ZONE 'Africa/Tunis') = span.month_start
     AND b.status = 'completed'
    GROUP BY span.month_start
    ORDER BY span.month_start
  `) as MonthlyVisits[];
}
