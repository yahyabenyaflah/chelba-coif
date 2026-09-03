import { TZDate } from "@date-fns/tz";

/**
 * Tout le domaine métier raisonne dans le fuseau du salon, pas dans celui du
 * serveur ni dans celui du navigateur. Un serveur en UTC et un client en France
 * doivent voir exactement le même créneau de 9 h.
 *
 * Les instants sont stockés en `timestamptz` (donc en UTC) et convertis à
 * l'affichage. Les *dates* de calendrier circulent en `YYYY-MM-DD`, sans heure,
 * pour ne jamais glisser d'un jour au passage d'un fuseau.
 */
export const SALON_TZ = "Africa/Tunis";

export type DayKey = string; // "YYYY-MM-DD"

const pad = (n: number) => String(n).padStart(2, "0");

/** Date de calendrier d'un instant, telle qu'elle est vécue au salon. */
export function toDayKey(instant: Date): DayKey {
  const local = new TZDate(instant, SALON_TZ);
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
}

export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now);
}

/** Convertit une heure murale du salon en instant absolu. */
export function salonWallClockToInstant(day: DayKey, minutesFromMidnight: number): Date {
  const [y, m, d] = day.split("-").map(Number);
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  // TZDate interprète ces composantes dans SALON_TZ et gère l'offset.
  return new Date(new TZDate(y, m - 1, d, hours, minutes, 0, 0, SALON_TZ).getTime());
}

/** 0 = dimanche … 6 = samedi, dans le fuseau du salon. */
export function weekdayOf(day: DayKey): number {
  const [y, m, d] = day.split("-").map(Number);
  return new TZDate(y, m - 1, d, 12, 0, 0, 0, SALON_TZ).getDay();
}

export function addDaysToKey(day: DayKey, days: number): DayKey {
  const [y, m, d] = day.split("-").map(Number);
  // Midi évite tout effet de bord de changement d'heure aux bornes du jour.
  const shifted = new TZDate(y, m - 1, d + days, 12, 0, 0, 0, SALON_TZ);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

/** `"09:30"` ou `"09:30:00"` → minutes depuis minuit. */
export function parseClock(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function formatClock(minutesFromMidnight: number): string {
  return `${pad(Math.floor(minutesFromMidnight / 60))}:${pad(minutesFromMidnight % 60)}`;
}

const dayLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: SALON_TZ,
});

const shortDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  timeZone: SALON_TZ,
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: SALON_TZ,
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: SALON_TZ,
});

function noonOf(day: DayKey): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, 12, 0, 0, 0, SALON_TZ).getTime());
}

/** « mardi 2 septembre » */
export function formatDayLabel(day: DayKey): string {
  return dayLabelFormatter.format(noonOf(day));
}

/** « mar. 2 » */
export function formatShortDay(day: DayKey): string {
  return shortDayFormatter.format(noonOf(day));
}

const monthLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "2-digit",
  timeZone: SALON_TZ,
});

/** « sept. 26 », à partir d'un mois « YYYY-MM ». */
export function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return monthLabelFormatter.format(new Date(new TZDate(y, m - 1, 1, 12, 0, 0, 0, SALON_TZ).getTime()));
}

/** « 2 septembre 2026 à 09:30 » */
export function formatDateTime(instant: Date): string {
  return dateTimeFormatter.format(instant);
}

/** « 09:30 » */
export function formatTime(instant: Date): string {
  return timeFormatter.format(instant);
}

export const WEEKDAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;
