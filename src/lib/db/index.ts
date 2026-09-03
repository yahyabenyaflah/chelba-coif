import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Client Drizzle sur le driver HTTP de Neon.
 *
 * Le driver HTTP est choisi plutôt que le driver WebSocket parce qu'il n'ouvre
 * aucune connexion persistante : c'est le bon compromis pour des fonctions
 * serverless au trafic irrégulier (un salon de coiffure). Contrepartie : il ne
 * supporte pas `db.transaction()`. Les rares opérations multi-tables devant
 * être atomiques (fidélité) sont écrites en une seule requête avec des CTE —
 * une instruction SQL unique est atomique par construction dans PostgreSQL.
 *
 * L'initialisation est paresseuse pour que l'import de ce module ne déclenche
 * pas la validation d'environnement au moment du build.
 */

type Db = ReturnType<typeof create>;

function create() {
  return drizzle(neon(env().DATABASE_URL), { schema, casing: "snake_case" });
}

let cached: Db | null = null;

export function getDb(): Db {
  cached ??= create();
  return cached;
}

/**
 * Accès SQL brut, pour les requêtes analytiques et les CTE atomiques que le
 * query builder n'exprime pas. Toujours appelé en tagged template : le driver
 * Neon paramètre alors les interpolations, il n'y a pas de concaténation de
 * chaîne et donc pas de surface d'injection SQL.
 */
export function getSql() {
  return neon(env().DATABASE_URL);
}

export { schema };
