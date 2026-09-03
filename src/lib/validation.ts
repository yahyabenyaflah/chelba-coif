import { z } from "zod";

/**
 * Schémas partagés entre les formulaires et les Server Actions.
 *
 * La validation côté serveur est la seule qui compte : une Server Action est
 * atteignable par un POST direct, sans passer par l'interface. Les mêmes
 * schémas servent côté client uniquement pour afficher les erreurs plus tôt.
 */

/**
 * bcrypt ignore tout ce qui dépasse 72 octets. La constante est redéfinie ici
 * plutôt qu'importée de `auth/password.ts` : ce module est aussi chargé par des
 * composants client, et `password.ts` est marqué `server-only`.
 */
const MAX_PASSWORD_BYTES = 72;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Numéros tunisiens : 8 chiffres, préfixe +216 ou 00216 accepté, espaces et
 * séparateurs tolérés à la saisie. Tout est normalisé en `+216XXXXXXXX` pour
 * qu'un même client ne se retrouve pas dupliqué sous trois écritures.
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s().-]/g, ""))
  .refine((v) => /^(\+216|00216)?[2-9]\d{7}$/.test(v), {
    message: "Numéro tunisien invalide (8 chiffres, ex. 50 882 529)",
  })
  .transform((v) => `+216${v.replace(/^(\+216|00216)/, "")}`);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Adresse e-mail invalide" }))
  .refine((v) => v.length <= 254, { message: "Adresse e-mail trop longue" });

export const passwordSchema = z
  .string()
  .min(10, { message: "10 caractères minimum" })
  .refine((v) => new TextEncoder().encode(v).length <= MAX_PASSWORD_BYTES, {
    message: `${MAX_PASSWORD_BYTES} caractères maximum`,
  })
  .refine((v) => /[a-zA-Z]/.test(v), { message: "Doit contenir au moins une lettre" })
  .refine((v) => /\d/.test(v), { message: "Doit contenir au moins un chiffre" });

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, { message: "Nom trop court" })
  .max(80, { message: "Nom trop long" });

export const dayKeySchema = z.string().regex(DAY_RE, { message: "Date invalide" });
export const clockSchema = z.string().regex(CLOCK_RE, { message: "Heure invalide" });

/**
 * Cases à cocher issues d'un FormData.
 *
 * `z.coerce.boolean()` serait faux ici : il applique `Boolean(v)`, donc la
 * chaîne `"false"` deviendrait `true`. Une case non cochée est simplement
 * absente du FormData (`null`), une case cochée vaut `"on"`.
 */
export const checkboxSchema = z
  .union([z.string(), z.boolean(), z.null(), z.undefined()])
  .transform((v) => v === true || v === "on" || v === "true" || v === "1");

// ---------------------------------------------------------------------------
// Réservation
// ---------------------------------------------------------------------------

export const createBookingSchema = z.object({
  serviceId: z.uuid({ message: "Prestation invalide" }),
  day: dayKeySchema,
  /** Minutes depuis minuit, heure du salon. */
  minutes: z.coerce.number().int().min(0).max(24 * 60 - 1),
  contactName: fullNameSchema,
  contactPhone: phoneSchema,
  notes: z.string().trim().max(500, { message: "500 caractères maximum" }).default(""),
});

export const bookingLookupSchema = z.object({
  // Le code est saisi à la main : on tolère la casse et les espaces.
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, { message: "Code à 6 caractères (ex. K7P2QM)" }),
  phone: phoneSchema,
});

// ---------------------------------------------------------------------------
// Comptes
// ---------------------------------------------------------------------------

export const signupSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // Pas de règle de complexité à la connexion : elle ne protégerait rien et
  // révélerait la politique de mots de passe.
  password: z.string().min(1, { message: "Mot de passe requis" }),
});

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export const serviceSchema = z.object({
  name: z.string().trim().min(2, { message: "Nom requis" }).max(80),
  description: z.string().trim().max(300).default(""),
  durationMin: z.coerce
    .number()
    .int()
    .min(5, { message: "5 minutes minimum" })
    .max(480, { message: "8 heures maximum" }),
  /** Saisi en dinars, converti en millimes pour éviter les flottants. */
  priceDt: z.coerce.number().min(0, { message: "Prix invalide" }).max(10_000),
  isActive: checkboxSchema,
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const haircutStyleSchema = z.object({
  title: z.string().trim().min(2, { message: "Titre requis" }).max(80),
  description: z.string().trim().max(300).default(""),
  // Format Cloudinary : dossiers autorisés, mais ni `..` ni protocole, pour
  // qu'un public_id manipulé ne puisse pas pointer ailleurs.
  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[A-Za-z0-9_\-/]+$/, { message: "Identifiant d'image invalide" })
    .refine((v) => !v.includes("//") && !v.includes(".."), {
      message: "Identifiant d'image invalide",
    }),
  width: z.coerce.number().int().min(1).max(20_000),
  height: z.coerce.number().int().min(1).max(20_000),
  serviceId: z.union([z.uuid(), z.literal("")]).default(""),
  isFeatured: checkboxSchema,
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const openingHourSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    isClosed: checkboxSchema,
    opensAt: clockSchema,
    closesAt: clockSchema,
    breakStart: z.union([clockSchema, z.literal("")]).default(""),
    breakEnd: z.union([clockSchema, z.literal("")]).default(""),
  })
  .refine((v) => v.isClosed || v.closesAt > v.opensAt, {
    message: "L'heure de fermeture doit suivre l'ouverture",
    path: ["closesAt"],
  })
  .refine((v) => (v.breakStart === "") === (v.breakEnd === ""), {
    message: "Renseignez le début et la fin de la pause",
    path: ["breakEnd"],
  })
  .refine((v) => v.breakStart === "" || v.breakEnd > v.breakStart, {
    message: "La fin de pause doit suivre le début",
    path: ["breakEnd"],
  });

export const closureSchema = z
  .object({
    startDate: dayKeySchema,
    endDate: dayKeySchema,
    reason: z.string().trim().max(120).default(""),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "La date de fin doit suivre la date de début",
    path: ["endDate"],
  });

export const settingsSchema = z.object({
  salonName: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  address: z.string().trim().min(2).max(160),
  slotIntervalMin: z.coerce.number().int().min(5).max(120),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  minAdvanceMin: z.coerce.number().int().min(0).max(10_080),
  pointsPerVisit: z.coerce.number().int().min(0).max(100),
  pointsForReward: z.coerce.number().int().min(1).max(1000),
  rewardLabel: z.string().trim().min(2).max(80),
});

export const bookingStatusSchema = z.enum([
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);

/** Aplatit les erreurs Zod en `{ champ: "message" }` pour les formulaires. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}
