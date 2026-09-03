import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Charge .env.local dans process.env sans dépendance externe.
 * Les valeurs déjà présentes dans l'environnement (CI, shell) ne sont pas
 * écrasées : ça permet de surcharger ponctuellement en ligne de commande.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(root, ".env.local");

if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
