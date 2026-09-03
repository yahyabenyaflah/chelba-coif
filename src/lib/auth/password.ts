import "server-only";

import { compare, hash } from "bcryptjs";

/**
 * Coût bcrypt. 12 ≈ 250 ms sur un CPU serverless courant : assez lent pour
 * rendre une attaque par dictionnaire coûteuse, assez rapide pour ne pas
 * dégrader la connexion.
 */
const COST = 12;

/**
 * bcrypt ignore silencieusement tout ce qui dépasse 72 octets. Un mot de passe
 * plus long serait donc tronqué sans que l'utilisateur le sache, et deux mots
 * de passe partageant les 72 premiers octets deviendraient interchangeables.
 * On refuse explicitement plutôt que de tronquer.
 */
export const MAX_PASSWORD_BYTES = 72;

export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}

export async function hashPassword(password: string): Promise<string> {
  if (passwordByteLength(password) > MAX_PASSWORD_BYTES) {
    throw new Error("Mot de passe trop long");
  }
  return hash(password, COST);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  if (passwordByteLength(password) > MAX_PASSWORD_BYTES) return false;
  return compare(password, hashed);
}

/**
 * Consomme un temps comparable à une vérification réelle quand le compte
 * n'existe pas. Sans ça, une réponse instantanée sur un e-mail inconnu contre
 * une réponse lente sur un e-mail connu permettrait d'énumérer les comptes au
 * chronomètre, malgré un message d'erreur identique.
 */
let dummyHash: Promise<string> | null = null;

export async function fakeVerify(): Promise<void> {
  // Le hash leurre est calculé à la volée plutôt que codé en dur : un littéral
  // mal formé serait rejeté par bcrypt en quelques microsecondes et ne
  // masquerait donc rien du tout.
  dummyHash ??= hash("mot-de-passe-factice", COST);
  await compare("mot-de-passe-different", await dummyHash);
}
