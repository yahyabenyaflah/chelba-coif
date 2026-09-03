import Image from "next/image";

import { buildImageUrl } from "@/lib/cloudinary-constants";
import { cn } from "@/lib/utils";

/**
 * Affiche une image Cloudinary à partir de son seul `public_id`.
 *
 * Volontairement sans `"use client"` ni `"server-only"` : ce composant est
 * rendu à la fois par des pages serveur (accueil, galerie publique) et par
 * des composants client (galerie admin, qui affiche un aperçu juste après un
 * dépôt). Il construit donc l'URL via la fonction pure de
 * `cloudinary-constants.ts` plutôt que via `@/lib/cloudinary` (server-only,
 * qui manipule la clé secrète) — le nom de cloud n'est pas sensible, il
 * apparaît de toute façon dans chaque URL d'image publique.
 *
 * `unoptimized` : Cloudinary applique déjà `f_auto,q_auto` (format et qualité
 * adaptés au navigateur) via l'URL de transformation — laisser en plus le
 * pipeline d'optimisation de Next re-traiter l'image doublerait le travail
 * pour un bénéfice nul.
 */
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
export function CloudinaryImage({
  publicId,
  alt,
  width,
  height,
  crop = "fill",
  className,
  priority,
  sizes,
}: {
  publicId: string;
  alt: string;
  width: number;
  height: number;
  crop?: "fill" | "fit";
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={buildImageUrl(CLOUD_NAME, publicId, { width: width * 2, height: height * 2, crop })}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      priority={priority}
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
