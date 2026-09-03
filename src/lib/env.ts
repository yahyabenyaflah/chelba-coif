import "server-only";

import { z } from "zod";

/**
 * Variables d'environnement, validées à la première lecture.
 *
 * La validation est paresseuse (et non au chargement du module) pour que
 * `next build` réussisse sur une machine sans secrets : seules les pages qui
 * touchent réellement la base ou Cloudinary échouent, et elles échouent avec un
 * message explicite plutôt qu'un `undefined` qui se propage.
 */

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL est vide")
    .refine((v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), {
      message: "DATABASE_URL doit être une URL de connexion PostgreSQL",
    }),

  // Clé de signature des cookies de session. 32 octets minimum : en dessous,
  // HS256 devient attaquable par force brute hors-ligne.
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET doit faire au moins 32 caractères"),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Doit porter la même valeur que CLOUDINARY_CLOUD_NAME : voir
  // src/lib/cloudinary-constants.ts pour pourquoi ce doublon existe.
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
}).refine((v) => v.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME === v.CLOUDINARY_CLOUD_NAME, {
  message: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME doit être identique à CLOUDINARY_CLOUD_NAME",
  path: ["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"],
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    // Le message liste les variables manquantes, jamais leurs valeurs.
    throw new Error(
      `Configuration d'environnement invalide :\n${details}\n\nCopiez .env.example vers .env.local et renseignez les valeurs.`,
    );
  }

  cached = parsed.data;
  return cached;
}
