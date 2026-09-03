import "server-only";

import { headers } from "next/headers";

import { getSql } from "@/lib/db";

/**
 * Limitation de débit adossée à PostgreSQL.
 *
 * Un compteur en mémoire ne conviendrait pas : en serverless, chaque instance
 * aurait le sien, et il suffirait d'attendre un recyclage pour repartir à zéro.
 * La table `rate_limits` est partagée, donc la limite est réelle.
 *
 * Le compteur est incrémenté en une seule instruction (INSERT ... ON CONFLICT
 * DO UPDATE ... RETURNING) : deux requêtes simultanées ne peuvent pas lire la
 * même valeur puis l'écraser mutuellement.
 */

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export async function rateLimit(params: {
  /** Identifiant du seau, ex. `login:ip:1.2.3.4`. */
  key: string;
  limit: number;
  windowSec: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowSec } = params;
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO rate_limits (bucket, hits, expires_at)
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
    ON CONFLICT (bucket) DO UPDATE SET
      hits = CASE WHEN rate_limits.expires_at <= now() THEN 1 ELSE rate_limits.hits + 1 END,
      expires_at = CASE
        WHEN rate_limits.expires_at <= now() THEN now() + make_interval(secs => ${windowSec})
        ELSE rate_limits.expires_at
      END
    RETURNING hits, expires_at
  `) as { hits: number; expires_at: string }[];

  const row = rows[0];
  const hits = row?.hits ?? 1;
  const expiresAt = row ? new Date(row.expires_at) : new Date(Date.now() + windowSec * 1000);
  const retryAfterSec = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));

  // Purge opportuniste : évite d'avoir à programmer une tâche planifiée pour
  // une table qui ne contient que des compteurs éphémères.
  if (Math.random() < 0.02) {
    await sql`DELETE FROM rate_limits WHERE expires_at <= now() - interval '1 hour'`;
  }

  return { ok: hits <= limit, remaining: Math.max(0, limit - hits), retryAfterSec };
}

/**
 * Adresse du client, telle que vue derrière le proxy de l'hébergeur.
 *
 * Ces en-têtes sont falsifiables si l'application est exposée sans proxy de
 * confiance ; la limitation par IP est donc une gêne pour l'attaquant, pas une
 * garantie. C'est pourquoi les actions sensibles limitent aussi sur une clé
 * métier (e-mail, téléphone) que l'attaquant ne peut pas faire varier
 * librement.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** Réduit une valeur en clé de seau courte et non réversible. */
export async function hashKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
