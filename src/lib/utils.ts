import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusionne des classes Tailwind en laissant la dernière gagner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Les prix sont stockés en millimes (entiers) : en dinars flottants, 3 × 8,10
 * donnerait 24,299999999999997. On ne divise qu'à l'affichage.
 */
export function formatPrice(millimes: number): string {
  return `${(millimes / 1000).toLocaleString("fr-TN", {
    minimumFractionDigits: millimes % 1000 === 0 ? 0 : 3,
    maximumFractionDigits: 3,
  })} DT`;
}

export function dtToMillimes(dt: number): number {
  return Math.round(dt * 1000);
}

export function millimesToDt(millimes: number): number {
  return millimes / 1000;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

/** Affiche « 50 882 529 » à partir de « +21650882529 ». */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/^\+216/, "");
  if (digits.length !== 8) return phone;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

/**
 * Alphabet sans 0/O ni 1/I/L : le code est lu au téléphone et recopié à la
 * main, les caractères ambigus généreraient des erreurs de saisie.
 */
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Code de réservation à 6 caractères, tiré d'une source cryptographique. */
export function generateReference(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  // Le modulo introduit un biais négligeable ici (256 % 31), et l'entropie
  // reste d'environ 29 bits — largement suffisante face au rate-limiting.
  return Array.from(bytes, (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join("");
}

export const BOOKING_STATUS_LABELS = {
  pending: "En attente",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
} as const;
