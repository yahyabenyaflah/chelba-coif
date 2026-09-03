import "server-only";

import { createHash } from "node:crypto";

import { env } from "@/lib/env";
import { buildImageUrl } from "@/lib/cloudinary-constants";

/**
 * Intégration Cloudinary — dépôt direct depuis le navigateur, signé côté
 * serveur.
 *
 * Le fichier ne transite jamais par l'application : le dashboard demande une
 * signature à `/api/cloudinary/sign`, puis envoie l'image directement à
 * Cloudinary. On évite ainsi la limite de taille des Server Actions et la
 * bande passante serveur.
 *
 * L'`api_secret` ne quitte jamais le serveur. Un dépôt « non signé » (unsigned
 * preset) serait plus simple mais laisserait n'importe qui remplir le compte
 * Cloudinary du client.
 */

/** Dossier imposé : borne ce que le dashboard peut créer dans le compte. */
export const UPLOAD_FOLDER = "chelba-coif/coupes";

export { ALLOWED_FORMATS, MAX_UPLOAD_BYTES } from "@/lib/cloudinary-constants";

export function cloudName(): string {
  return env().CLOUDINARY_CLOUD_NAME;
}

/**
 * Signature Cloudinary : SHA-1 des paramètres triés par nom, concaténés en
 * query-string, suivis de l'api_secret. L'ordre alphabétique est imposé par
 * Cloudinary — une signature calculée sur un autre ordre est rejetée.
 */
export function signUploadParams(params: Record<string, string | number>): {
  signature: string;
  apiKey: string;
  timestamp: number;
  cloudName: string;
} {
  const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } = env();

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign: Record<string, string | number> = { ...params, timestamp };

  const canonical = Object.keys(toSign)
    .sort()
    .map((k) => `${k}=${toSign[k]}`)
    .join("&");

  const signature = createHash("sha1")
    .update(canonical + CLOUDINARY_API_SECRET)
    .digest("hex");

  return {
    signature,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    cloudName: CLOUDINARY_CLOUD_NAME,
  };
}

/**
 * Construit l'URL de diffusion à partir du seul `public_id` stocké en base.
 *
 * Reconstruire plutôt que stocker l'URL complète garantit qu'aucune URL
 * arbitraire venue d'un formulaire ne peut se retrouver dans un `<Image>` :
 * le domaine est toujours celui du compte Cloudinary configuré.
 *
 * `f_auto,q_auto` laisse Cloudinary servir AVIF/WebP selon le navigateur.
 */
export function imageUrl(
  publicId: string,
  opts: { width?: number; height?: number; crop?: "fill" | "fit" } = {},
): string {
  return buildImageUrl(cloudName(), publicId, opts);
}

/**
 * Supprime une image. Appelé quand le coiffeur retire une coupe de la galerie,
 * pour que le compte Cloudinary ne se remplisse pas d'orphelins.
 */
export async function destroyImage(publicId: string): Promise<void> {
  const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } = env();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: CLOUDINARY_API_KEY,
    signature,
  });

  await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
    method: "POST",
    body,
  });
}
