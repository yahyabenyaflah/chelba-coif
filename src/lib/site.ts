import "server-only";

import { env } from "@/lib/env";

/**
 * URL publique du site, pour les liens absolus (metadataBase, e-mails).
 *
 * Retombe sur un placeholder tant que `SITE_URL` n'est pas renseignée en
 * production — à mettre à jour dans les variables d'environnement une fois
 * le domaine réel connu (URL Vercel ou domaine personnalisé).
 */
export function siteUrl(): string {
  return env().SITE_URL ?? "https://chelba-coif.tn";
}
