import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getDb, schema } from "@/lib/db";
import { readSessionCookie } from "./session";

/**
 * Couche d'accès aux données (Data Access Layer).
 *
 * Toute vérification d'identité passe par ici, et jamais par le seul cookie :
 * une Server Action est joignable par un POST direct, `proxy.ts` ne fait qu'un
 * filtrage optimiste, et un cookie signé reste valide même après suppression du
 * compte. Ces fonctions sont donc appelées *à l'intérieur* de chaque action et
 * de chaque page protégée.
 *
 * `cache()` déduplique l'appel sur la durée d'un rendu : la vérification coûte
 * une requête même si dix composants la demandent.
 */

export type AdminSession = { id: string; email: string; fullName: string };
export type CustomerSession = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  loyaltyPoints: number;
};

export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  const session = await readSessionCookie("admin");
  if (!session) return null;

  const rows = await getDb()
    .select({
      id: schema.adminUsers.id,
      email: schema.adminUsers.email,
      fullName: schema.adminUsers.fullName,
      sessionsValidFrom: schema.adminUsers.sessionsValidFrom,
    })
    .from(schema.adminUsers)
    .where(eq(schema.adminUsers.id, session.sub))
    .limit(1);

  const admin = rows[0];
  if (!admin) return null;
  // Jeton émis avant la dernière invalidation globale : refusé.
  if (session.iat * 1000 < admin.sessionsValidFrom.getTime()) return null;

  return { id: admin.id, email: admin.email, fullName: admin.fullName };
});

export const getCustomer = cache(async (): Promise<CustomerSession | null> => {
  const session = await readSessionCookie("customer");
  if (!session) return null;

  const rows = await getDb()
    .select({
      id: schema.customers.id,
      email: schema.customers.email,
      fullName: schema.customers.fullName,
      phone: schema.customers.phone,
      loyaltyPoints: schema.customers.loyaltyPoints,
      isBlocked: schema.customers.isBlocked,
      sessionsValidFrom: schema.customers.sessionsValidFrom,
    })
    .from(schema.customers)
    .where(eq(schema.customers.id, session.sub))
    .limit(1);

  const customer = rows[0];
  if (!customer) return null;
  if (customer.isBlocked) return null;
  if (session.iat * 1000 < customer.sessionsValidFrom.getTime()) return null;

  return {
    id: customer.id,
    email: customer.email,
    fullName: customer.fullName,
    phone: customer.phone,
    loyaltyPoints: customer.loyaltyPoints,
  };
});

/** Pour les pages : redirige vers la connexion si la session est absente. */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/connexion");
  return admin;
}

export async function requireCustomer(): Promise<CustomerSession> {
  const customer = await getCustomer();
  if (!customer) redirect("/compte/connexion");
  return customer;
}

/**
 * Pour les Server Actions : lève au lieu de rediriger, afin que l'action
 * renvoie une erreur exploitable par le formulaire.
 */
export class UnauthorizedError extends Error {
  constructor(message = "Session expirée. Reconnectez-vous.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireAdminAction(): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) throw new UnauthorizedError();
  return admin;
}

export async function requireCustomerAction(): Promise<CustomerSession> {
  const customer = await getCustomer();
  if (!customer) throw new UnauthorizedError();
  return customer;
}
