import "./load-env.mjs";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

/**
 * Exécute les fichiers SQL de /drizzle dans l'ordre alphabétique.
 *
 * Connexion directe via `pg` (protocole simple, multi-instructions), utilisée
 * uniquement ici : le reste de l'application passe par le driver HTTP de Neon
 * (voir src/lib/db/index.ts), plus adapté au runtime serverless.
 *
 * Toutes les instructions du dossier sont écrites en `IF NOT EXISTS` /
 * `ON CONFLICT DO NOTHING`, donc ce script est rejouable sans risque.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dir = join(root, "drizzle");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant. Renseignez-le dans .env.local.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

await client.connect();

try {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`→ ${file}`);
    const content = readFileSync(join(dir, file), "utf-8");
    await client.query(content);
    console.log("  ok");
  }

  console.log(`Terminé : ${files.length} fichier(s) appliqué(s).`);
} finally {
  await client.end();
}
