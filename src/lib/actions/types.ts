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
