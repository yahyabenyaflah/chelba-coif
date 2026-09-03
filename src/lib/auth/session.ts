import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { env } from "@/lib/env";

/**
 * Sessions sans état : un JWT HS256 stocké dans un cookie httpOnly.
 *
 * Le jeton ne porte que l'identifiant et le rôle — aucune donnée personnelle,
 * puisqu'un JWT est signé mais lisible par n'importe qui. La révocation est
 * assurée par `sessionsValidFrom` en base, comparé au `iat` du jeton (voir
 * `dal.ts`) : changer de mot de passe invalide instantanément les sessions
 * ouvertes ailleurs, ce qu'un JWT seul ne permet pas.
 */

export type Role = "admin" | "customer";

/** Cookies distincts : une session client ne doit jamais ouvrir l'admin. */
const COOKIE = {
  admin: "cc_admin_session",
  customer: "cc_customer_session",
} as const satisfies Record<Role, string>;

/** L'espace d'administration expire plus vite : le risque y est plus élevé. */
const MAX_AGE_SECONDS = {
  admin: 60 * 60 * 12, // 12 h
  customer: 60 * 60 * 24 * 30, // 30 jours
} as const satisfies Record<Role, number>;

export type SessionPayload = {
  sub: string;
  role: Role;
  /** Émission, en secondes. Sert au contrôle de révocation. */
  iat: number;
};

function key(): Uint8Array {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export async function createSession(role: Role, userId: string): Promise<void> {
  const maxAge = MAX_AGE_SECONDS[role];
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(key());

  const store = await cookies();
  store.set(COOKIE[role], token, {
    httpOnly: true, // inaccessible au JavaScript de la page : neutralise le vol par XSS
    secure: process.env.NODE_ENV === "production", // en clair uniquement sur localhost
    sameSite: "lax", // le cookie ne part pas sur une requête POST cross-site (CSRF)
    path: "/",
    maxAge,
  });
}

export async function destroySession(role: Role): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE[role]);
}

/**
 * Vérifie la signature et l'expiration du cookie. Ne dit rien de l'existence
 * du compte ni d'une révocation : c'est le rôle de la couche d'accès aux
 * données (`dal.ts`), qui seule doit servir de garde pour une action sensible.
 */
export async function readSessionCookie(role: Role): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE[role])?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.role !== role || typeof payload.sub !== "string" || typeof payload.iat !== "number") {
      return null;
    }
    return { sub: payload.sub, role, iat: payload.iat };
  } catch {
    // Signature invalide, jeton expiré ou malformé : session absente.
    return null;
  }
}

export const SESSION_COOKIE_NAMES = COOKIE;
