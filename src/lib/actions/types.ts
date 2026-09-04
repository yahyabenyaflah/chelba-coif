import type { BookingStatus } from "@/lib/db/schema";

/**
 * Forme de retour commune à toutes les Server Actions, consommée par
 * `useActionState`. Un objet sérialisable plutôt qu'une exception : une erreur
 * jetée dans une action produit en production un message générique, inutile
 * pour guider l'utilisateur.
 */
export type ActionState = {
  status: "idle" | "success" | "error";
  /** Message global (bandeau). */
  message?: string;
  /** Erreurs par champ, clés alignées sur les `name` du formulaire. */
  errors?: Record<string, string>;
  /** Charge utile en cas de succès (ex. code de réservation). */
  data?: Record<string, string>;
};

export const idleState: ActionState = { status: "idle" };

export function errorState(message: string, errors?: Record<string, string>): ActionState {
  return { status: "error", message, errors };
}

export function successState(message: string, data?: Record<string, string>): ActionState {
  return { status: "success", message, data };
}

/**
 * Forme de retour de `lookupBookingAction` (voir `actions/booking.ts`) : une
 * recherche par téléphone peut renvoyer plusieurs réservations, ce que la
 * forme générique `ActionState.data` (`Record<string, string>`) n'exprime pas.
 *
 * Définie ici plutôt que dans booking.ts : un fichier `"use server"` ne peut
 * exporter que des fonctions async — un export de type ou de constante depuis
 * ce fichier ferait échouer le build (« A "use server" file can only export
 * async functions »).
 */
export type LookedUpBooking = {
  id: string;
  reference: string;
  status: BookingStatus;
  serviceName: string;
  startsAt: string; // ISO
  priceMillimes: number;
};

export type LookupState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
  bookings?: LookedUpBooking[];
};

export const idleLookupState: LookupState = { status: "idle" };
