"use server";

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { fakeVerify, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { clientIp, hashKey, rateLimit } from "@/lib/rate-limit";
import { fieldErrors, loginSchema, signupSchema } from "@/lib/validation";
import { errorState, type ActionState } from "./types";

/**
 * Message unique pour tous les échecs de connexion : distinguer « e-mail
 * inconnu » de « mot de passe faux » permettrait d'énumérer les comptes.
 */
const GENERIC_LOGIN_ERROR = "E-mail ou mot de passe incorrect.";

/**
 * Limite les tentatives sur deux axes. L'IP seule est contournable via un
 * réseau de machines ; l'e-mail seul permettrait de bloquer un compte tiers en
 * le saturant. Les deux ensemble couvrent chacun le défaut de l'autre.
 *
 * Un seul point d'entrée sert désormais aussi bien le coiffeur que les
 * clients (voir `unifiedLoginAction`) : la limite retient le seuil le plus
 * strict des deux anciens (admin séparément protégé) puisqu'on ne sait pas à
 * l'avance quel type de compte l'e-mail désigne.
 */
async function loginRateLimit(email: string): Promise<boolean> {
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    rateLimit({ key: `login:ip:${await hashKey(ip)}`, limit: 10, windowSec: 900 }),
    rateLimit({ key: `login:email:${await hashKey(email)}`, limit: 8, windowSec: 900 }),
  ]);
  return byIp.ok && byEmail.ok;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function signupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clientIp();
  const limit = await rateLimit({
    key: `signup:ip:${await hashKey(ip)}`,
    limit: 5,
    windowSec: 3600,
  });
  if (!limit.ok) return errorState("Trop de tentatives. Réessayez plus tard.");

  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return errorState("Vérifiez les informations saisies.", fieldErrors(parsed.error));
  }

  const { fullName, email, phone, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  const db = getDb();

  let customerId: string;
  try {
    const inserted = await db
      .insert(schema.customers)
      .values({ fullName, email, phone, passwordHash })
      .returning({ id: schema.customers.id });
    customerId = inserted[0]!.id;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      // L'e-mail existe déjà. L'information est de toute façon déductible en
      // tentant une connexion, et un message vague empêcherait l'inscription.
      return errorState("Un compte existe déjà avec cette adresse.", {
        email: "Adresse déjà utilisée",
      });
    }
    throw error;
  }

  // Rattache les réservations passées faites en invité avec le même numéro :
  // le client retrouve son historique et ses visites comptent pour la fidélité.
  await db
    .update(schema.bookings)
    .set({ customerId })
    .where(sql`${schema.bookings.contactPhone} = ${phone} AND ${schema.bookings.customerId} IS NULL`);

  await createSession("customer", customerId);
  redirect("/compte");
}

export async function customerLogoutAction(): Promise<void> {
  await destroySession("customer");
  redirect("/");
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export async function adminLogoutAction(): Promise<void> {
  await destroySession("admin");
  redirect("/admin/connexion");
}

// ---------------------------------------------------------------------------
// Connexion unifiée
// ---------------------------------------------------------------------------

/**
 * Un seul formulaire, utilisable indifféremment depuis `/admin/connexion` ou
 * `/compte/connexion` : l'e-mail saisi détermine le type de compte, pas la
 * page d'où vient la requête. Le coiffeur et un client peuvent donc se
 * connecter depuis le même endroit sans avoir à se souvenir de « la bonne »
 * page.
 *
 * Sécurité : exactement une vérification de mot de passe (réelle ou factice)
 * est exécutée par appel, quelle que soit la branche empruntée — un e-mail
 * administrateur, un e-mail client, ou un e-mail inconnu prennent donc un
 * temps comparable, et le minutage de la réponse ne révèle pas dans quelle
 * table (ou aucune) l'e-mail existe.
 */
export async function unifiedLoginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return errorState("Vérifiez les informations saisies.", fieldErrors(parsed.error));
  }
  const { email, password } = parsed.data;

  if (!(await loginRateLimit(email))) {
    return errorState("Trop de tentatives. Réessayez dans quelques minutes.");
  }

  const [adminRows, customerRows] = await Promise.all([
    getDb()
      .select({ id: schema.adminUsers.id, passwordHash: schema.adminUsers.passwordHash })
      .from(schema.adminUsers)
      .where(sql`lower(${schema.adminUsers.email}) = ${email}`)
      .limit(1),
    getDb()
      .select({
        id: schema.customers.id,
        passwordHash: schema.customers.passwordHash,
        isBlocked: schema.customers.isBlocked,
      })
      .from(schema.customers)
      .where(sql`lower(${schema.customers.email}) = ${email}`)
      .limit(1),
  ]);

  const admin = adminRows[0];
  const customer = customerRows[0];

  if (admin) {
    if (!(await verifyPassword(password, admin.passwordHash))) return errorState(GENERIC_LOGIN_ERROR);
    await createSession("admin", admin.id);
    redirect("/admin");
  }

  if (customer) {
    const valid = await verifyPassword(password, customer.passwordHash);
    if (!valid || customer.isBlocked) return errorState(GENERIC_LOGIN_ERROR);
    await createSession("customer", customer.id);
    redirect("/compte");
  }

  // Ni l'un ni l'autre : temps comparable à une vérification réelle.
  await fakeVerify();
  return errorState(GENERIC_LOGIN_ERROR);
}
