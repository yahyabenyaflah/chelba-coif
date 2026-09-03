"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireAdminAction } from "@/lib/auth/dal";
import { destroyImage } from "@/lib/cloudinary";
import { getDb, getSql, schema } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { dtToMillimes } from "@/lib/utils";
import {
  bookingStatusSchema,
  checkboxSchema,
  closureSchema,
  fieldErrors,
  haircutStyleSchema,
  openingHourSchema,
  serviceSchema,
  settingsSchema,
} from "@/lib/validation";
import { errorState, successState, type ActionState } from "./types";

/**
 * Actions réservées au coiffeur.
 *
 * Chaque action appelle `requireAdminAction()` en première instruction. Ce
 * n'est pas redondant avec `proxy.ts` : le proxy ne protège que la navigation,
 * alors qu'une Server Action est un endpoint POST joignable directement.
 */

function refreshAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/prestations");
  revalidatePath("/admin/galerie");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/horaires");
}

function refreshPublic() {
  revalidatePath("/");
  revalidatePath("/coupes");
  revalidatePath("/reserver");
}

// ---------------------------------------------------------------------------
// Réservations
// ---------------------------------------------------------------------------

/**
 * Change le statut d'un rendez-vous, et crédite la fidélité au passage à
 * « terminé ».
 *
 * Les trois écritures (statut, écriture au registre, solde du client) tiennent
 * dans une seule instruction SQL : PostgreSQL l'exécute atomiquement, ce que le
 * driver HTTP de Neon ne permettrait pas avec des requêtes séparées. L'index
 * unique `loyalty_booking_earn_key` garantit qu'un même rendez-vous ne crédite
 * jamais deux fois, même si le coiffeur repasse le statut plusieurs fois.
 */
export async function updateBookingStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const id = String(formData.get("bookingId") ?? "");
  const parsedStatus = bookingStatusSchema.safeParse(formData.get("status"));
  if (!id || !parsedStatus.success) return errorState("Requête invalide.");
  const status = parsedStatus.data;

  const settings = await getSettings();
  const sql = getSql();

  if (status === "completed") {
    await sql`
      WITH updated AS (
        UPDATE bookings
        SET status = 'completed', updated_at = now(), cancelled_at = NULL
        WHERE id = ${id}::uuid
        RETURNING id, customer_id
      ),
      earned AS (
        INSERT INTO loyalty_transactions (customer_id, booking_id, points, reason)
        SELECT customer_id, id, ${settings.pointsPerVisit}, 'Visite au salon'
        FROM updated
        WHERE customer_id IS NOT NULL AND ${settings.pointsPerVisit} > 0
        ON CONFLICT DO NOTHING
        RETURNING customer_id, points
      )
      UPDATE customers c
      SET loyalty_points = c.loyalty_points + earned.points
      FROM earned
      WHERE c.id = earned.customer_id
    `;
  } else {
    await sql`
      UPDATE bookings
      SET status = ${status}::booking_status,
          updated_at = now(),
          cancelled_at = CASE WHEN ${status} IN ('cancelled','no_show') THEN now() ELSE NULL END
      WHERE id = ${id}::uuid
    `;
  }

  refreshAdmin();
  revalidatePath("/compte");
  revalidatePath("/reserver");
  return successState("Rendez-vous mis à jour.");
}

export async function updateBookingNotesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const id = String(formData.get("bookingId") ?? "");
  const notes = String(formData.get("adminNotes") ?? "").slice(0, 1000);
  if (!id) return errorState("Requête invalide.");

  await getDb()
    .update(schema.bookings)
    .set({ adminNotes: notes, updatedAt: new Date() })
    .where(eq(schema.bookings.id, id));

  refreshAdmin();
  return successState("Note enregistrée.");
}

// ---------------------------------------------------------------------------
// Prestations
// ---------------------------------------------------------------------------

export async function saveServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    durationMin: formData.get("durationMin"),
    priceDt: formData.get("priceDt"),
    isActive: formData.get("isActive"),
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) {
    return errorState("Vérifiez les informations saisies.", fieldErrors(parsed.error));
  }

  const id = String(formData.get("serviceId") ?? "");
  const values = {
    name: parsed.data.name,
    description: parsed.data.description,
    durationMin: parsed.data.durationMin,
    priceMillimes: dtToMillimes(parsed.data.priceDt),
    isActive: parsed.data.isActive,
    sortOrder: parsed.data.sortOrder,
  };

  const db = getDb();
  if (id) {
    await db.update(schema.services).set(values).where(eq(schema.services.id, id));
  } else {
    // Slug dérivé du nom, suffixé pour rester unique sans imposer de saisie.
    const base = parsed.data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // retire les accents laisses par NFD
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const slug = `${base || "prestation"}-${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(schema.services).values({ ...values, slug });
  }

  refreshAdmin();
  refreshPublic();
  return successState(id ? "Prestation modifiée." : "Prestation ajoutée.");
}

/**
 * Désactive une prestation au lieu de la supprimer : les rendez-vous passés y
 * font référence (contrainte ON DELETE RESTRICT) et l'historique doit rester
 * lisible dans les statistiques.
 */
export async function toggleServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const id = String(formData.get("serviceId") ?? "");
  const isActive = checkboxSchema.parse(formData.get("isActive"));
  if (!id) return errorState("Requête invalide.");

  await getDb().update(schema.services).set({ isActive }).where(eq(schema.services.id, id));

  refreshAdmin();
  refreshPublic();
  return successState(isActive ? "Prestation réactivée." : "Prestation masquée.");
}

// ---------------------------------------------------------------------------
// Galerie
// ---------------------------------------------------------------------------

export async function saveHaircutStyleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const parsed = haircutStyleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    cloudinaryPublicId: formData.get("cloudinaryPublicId"),
    width: formData.get("width"),
    height: formData.get("height"),
    serviceId: formData.get("serviceId") ?? "",
    isFeatured: formData.get("isFeatured"),
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) {
    return errorState("Vérifiez les informations saisies.", fieldErrors(parsed.error));
  }

  const id = String(formData.get("styleId") ?? "");
  const values = {
    title: parsed.data.title,
    description: parsed.data.description,
    cloudinaryPublicId: parsed.data.cloudinaryPublicId,
    width: parsed.data.width,
    height: parsed.data.height,
    serviceId: parsed.data.serviceId === "" ? null : parsed.data.serviceId,
    isFeatured: parsed.data.isFeatured,
    sortOrder: parsed.data.sortOrder,
  };

  const db = getDb();
  if (id) {
    await db.update(schema.haircutStyles).set(values).where(eq(schema.haircutStyles.id, id));
  } else {
    await db.insert(schema.haircutStyles).values(values);
  }

  refreshAdmin();
  refreshPublic();
  return successState(id ? "Coupe modifiée." : "Coupe ajoutée à la galerie.");
}

export async function deleteHaircutStyleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const id = String(formData.get("styleId") ?? "");
  if (!id) return errorState("Requête invalide.");

  const deleted = await getDb()
    .delete(schema.haircutStyles)
    .where(eq(schema.haircutStyles.id, id))
    .returning({ publicId: schema.haircutStyles.cloudinaryPublicId });

  const publicId = deleted[0]?.publicId;
  if (publicId) {
    // La ligne est déjà supprimée : si Cloudinary échoue, l'image devient un
    // orphelin, ce qui est préférable à une galerie affichant une image morte.
    try {
      await destroyImage(publicId);
    } catch {
      // Silencieux volontairement : l'échec ne doit pas bloquer le coiffeur.
    }
  }

  refreshAdmin();
  refreshPublic();
  return successState("Coupe supprimée.");
}

// ---------------------------------------------------------------------------
// Horaires et fermetures
// ---------------------------------------------------------------------------

export async function saveOpeningHoursAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const db = getDb();
  const errors: Record<string, string> = {};

  // Les sept jours sont enregistrés d'un bloc : le formulaire les présente
  // ensemble, et une validation partielle laisserait un planning incohérent.
  for (let weekday = 0; weekday < 7; weekday++) {
    const parsed = openingHourSchema.safeParse({
      weekday,
      isClosed: formData.get(`isClosed-${weekday}`),
      opensAt: formData.get(`opensAt-${weekday}`),
      closesAt: formData.get(`closesAt-${weekday}`),
      breakStart: formData.get(`breakStart-${weekday}`) ?? "",
      breakEnd: formData.get(`breakEnd-${weekday}`) ?? "",
    });

    if (!parsed.success) {
      for (const [field, message] of Object.entries(fieldErrors(parsed.error))) {
        errors[`${field}-${weekday}`] = message;
      }
      continue;
    }

    const v = parsed.data;
    await db
      .update(schema.openingHours)
      .set({
        isClosed: v.isClosed,
        opensAt: v.opensAt,
        closesAt: v.closesAt,
        breakStart: v.breakStart === "" ? null : v.breakStart,
        breakEnd: v.breakEnd === "" ? null : v.breakEnd,
      })
      .where(eq(schema.openingHours.weekday, weekday));
  }

  if (Object.keys(errors).length > 0) {
    return errorState("Certains jours n'ont pas pu être enregistrés.", errors);
  }

  refreshAdmin();
  refreshPublic();
  return successState("Horaires enregistrés.");
}

export async function addClosureAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const parsed = closureSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) {
    return errorState("Vérifiez les dates.", fieldErrors(parsed.error));
  }

  await getDb().insert(schema.closures).values(parsed.data);

  refreshAdmin();
  refreshPublic();
  return successState("Fermeture ajoutée.");
}

export async function deleteClosureAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const id = String(formData.get("closureId") ?? "");
  if (!id) return errorState("Requête invalide.");

  await getDb().delete(schema.closures).where(eq(schema.closures.id, id));

  refreshAdmin();
  refreshPublic();
  return successState("Fermeture supprimée.");
}

// ---------------------------------------------------------------------------
// Réglages
// ---------------------------------------------------------------------------

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const parsed = settingsSchema.safeParse({
    salonName: formData.get("salonName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    slotIntervalMin: formData.get("slotIntervalMin"),
    maxAdvanceDays: formData.get("maxAdvanceDays"),
    minAdvanceMin: formData.get("minAdvanceMin"),
    pointsPerVisit: formData.get("pointsPerVisit"),
    pointsForReward: formData.get("pointsForReward"),
    rewardLabel: formData.get("rewardLabel"),
  });
  if (!parsed.success) {
    return errorState("Vérifiez les réglages.", fieldErrors(parsed.error));
  }

  await getDb()
    .update(schema.salonSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schema.salonSettings.id, 1));

  refreshAdmin();
  refreshPublic();
  return successState("Réglages enregistrés.");
}

// ---------------------------------------------------------------------------
// Fidélité
// ---------------------------------------------------------------------------

/**
 * Utilise la récompense d'un client : débite les points et journalise le
 * mouvement. Le `WHERE loyalty_points >= seuil` dans l'UPDATE empêche tout
 * solde négatif, y compris si deux échanges partent en même temps.
 */
export async function redeemRewardAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminAction();

  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) return errorState("Requête invalide.");

  const settings = await getSettings();
  const rows = (await getSql()`
    WITH debited AS (
      UPDATE customers
      SET loyalty_points = loyalty_points - ${settings.pointsForReward}
      WHERE id = ${customerId}::uuid
        AND loyalty_points >= ${settings.pointsForReward}
      RETURNING id
    )
    INSERT INTO loyalty_transactions (customer_id, points, reason)
    SELECT id, ${-settings.pointsForReward}, ${`Récompense utilisée : ${settings.rewardLabel}`}
    FROM debited
    RETURNING customer_id
  `) as { customer_id: string }[];

  if (rows.length === 0) {
    return errorState("Ce client n'a pas assez de points.");
  }

  refreshAdmin();
  revalidatePath("/compte");
  return successState(`Récompense enregistrée : ${settings.rewardLabel}.`);
}
