import {
  type DayKey,
  formatClock,
  parseClock,
  salonWallClockToInstant,
  weekdayOf,
} from "@/lib/time";

/**
 * Calcul des créneaux réservables.
 *
 * Fonctions pures, sans accès base ni horloge implicite : `now` est passé en
 * paramètre pour que le résultat soit reproductible et testable.
 */

export type OpeningRule = {
  weekday: number;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
  breakStart: string | null;
  breakEnd: string | null;
};

export type ClosureRange = { startDate: string; endDate: string };

export type BusyRange = { startsAt: Date; endsAt: Date };

export type Slot = {
  /** Minutes depuis minuit, heure du salon. */
  minutes: number;
  /** « 09:30 » */
  label: string;
  startsAt: Date;
  endsAt: Date;
  available: boolean;
  /** Renseigné seulement si `available` est faux, pour l'infobulle. */
  reason?: "past" | "taken";
};

export function isClosedOn(day: DayKey, closures: ClosureRange[]): boolean {
  // Comparaison lexicographique : valide car le format YYYY-MM-DD est ordonné.
  return closures.some((c) => day >= c.startDate && day <= c.endDate);
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function computeSlots(params: {
  day: DayKey;
  rules: OpeningRule[];
  closures: ClosureRange[];
  busy: BusyRange[];
  serviceDurationMin: number;
  slotIntervalMin: number;
  minAdvanceMin: number;
  now: Date;
}): Slot[] {
  const {
    day,
    rules,
    closures,
    busy,
    serviceDurationMin,
    slotIntervalMin,
    minAdvanceMin,
    now,
  } = params;

  if (isClosedOn(day, closures)) return [];

  const rule = rules.find((r) => r.weekday === weekdayOf(day));
  if (!rule || rule.isClosed) return [];

  const open = parseClock(rule.opensAt);
  const close = parseClock(rule.closesAt);
  const hasBreak = rule.breakStart !== null && rule.breakEnd !== null;
  const breakStart = hasBreak ? parseClock(rule.breakStart!) : 0;
  const breakEnd = hasBreak ? parseClock(rule.breakEnd!) : 0;

  const earliest = now.getTime() + minAdvanceMin * 60_000;
  const slots: Slot[] = [];

  // La prestation doit tenir entièrement avant la fermeture : on s'arrête à
  // `close - durée`, sinon on proposerait un rendez-vous qui déborde.
  for (let m = open; m + serviceDurationMin <= close; m += slotIntervalMin) {
    // Un créneau à cheval sur la pause n'est pas proposé du tout : l'afficher
    // grisé laisserait croire qu'il pourrait se libérer.
    if (hasBreak && overlaps(m, m + serviceDurationMin, breakStart, breakEnd)) continue;

    const startsAt = salonWallClockToInstant(day, m);
    const endsAt = new Date(startsAt.getTime() + serviceDurationMin * 60_000);

    let available = true;
    let reason: Slot["reason"];

    if (startsAt.getTime() < earliest) {
      available = false;
      reason = "past";
    } else if (
      busy.some((b) =>
        overlaps(startsAt.getTime(), endsAt.getTime(), b.startsAt.getTime(), b.endsAt.getTime()),
      )
    ) {
      available = false;
      reason = "taken";
    }

    slots.push({ minutes: m, label: formatClock(m), startsAt, endsAt, available, reason });
  }

  return slots;
}

/**
 * Vérifie qu'un instant proposé par le client tombe bien sur un créneau que le
 * salon offre réellement. Indispensable : le formulaire renvoie une heure que
 * l'utilisateur peut falsifier, il ne suffit pas qu'elle soit libre.
 */
export function isValidSlotStart(params: {
  startsAt: Date;
  rules: OpeningRule[];
  closures: ClosureRange[];
  serviceDurationMin: number;
  slotIntervalMin: number;
  day: DayKey;
}): boolean {
  const { startsAt, rules, closures, serviceDurationMin, slotIntervalMin, day } = params;

  if (isClosedOn(day, closures)) return false;
  const rule = rules.find((r) => r.weekday === weekdayOf(day));
  if (!rule || rule.isClosed) return false;

  const open = parseClock(rule.opensAt);
  const close = parseClock(rule.closesAt);

  for (let m = open; m + serviceDurationMin <= close; m += slotIntervalMin) {
    if (
      rule.breakStart !== null &&
      rule.breakEnd !== null &&
      overlaps(m, m + serviceDurationMin, parseClock(rule.breakStart), parseClock(rule.breakEnd))
    ) {
      continue;
    }
    if (salonWallClockToInstant(day, m).getTime() === startsAt.getTime()) return true;
  }
  return false;
}
