/**
 * Constantes Cloudinary partagées entre client et serveur.
 *
 * Séparées de `cloudinary.ts` (marqué `server-only`, il manipule la clé
 * secrète) pour que le composant client d'upload puisse valider un fichier
 * avant envoi sans tirer de code serveur dans le bundle navigateur.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 Mo
export const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "avif"] as const;

/**
 * Construit l'URL de diffusion d'une image à partir de son `public_id`.
 *
 * Fonction pure (pas d'accès à `api_secret`) : le nom de cloud n'est pas un
 * secret, il apparaît de toute façon dans chaque URL d'image publique. C'est
 * ce qui permet à ce fichier d'être importé aussi bien côté client (voir
 * `CloudinaryImage`, utilisé par des composants client comme la galerie
 * admin) que côté serveur.
 */
export function buildImageUrl(
  cloudName: string,
  publicId: string,
  opts: { width?: number; height?: number; crop?: "fill" | "fit" } = {},
): string {
  const transforms = ["f_auto", "q_auto"];
  if (opts.width) transforms.push(`w_${opts.width}`);
  if (opts.height) transforms.push(`h_${opts.height}`);
  if (opts.crop) transforms.push(`c_${opts.crop}`);
  if (opts.crop === "fill") transforms.push("g_auto");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(",")}/${publicId}`;
}
