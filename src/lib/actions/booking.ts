"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getCustomer } from "@/lib/auth/dal";
import { getDb, schema } from "@/lib/db";
import {
  getOpeningRules,
  getServiceById,
  getSettings,
  getUpcomingClosures,
  findBookingsByPhone,
} from "@/lib/data";
import { isValidSlotStart } from "@/lib/booking/slots";
import { newBookingEmail, sendAdminNotification } from "@/lib/email";
import { clientIp, hashKey, rateLimit } from "@/lib/rate-limit";
import { addDaysToKey, formatDateTime, salonWallClockToInstant, todayKey } from "@/lib/time";
import { formatPrice, generateReference } from "@/lib/utils";
import {
  bookingCancelSchema,
  bookingLookupSchema,
  createBookingSchema,
  fieldErrors,
} from "@/lib/validation";
import { errorState, successState, type ActionState, type LookupState } from "./types";

/**
 * Codes d'erreur PostgreSQL utiles ici.
 * - 23505 : violation d'unicité (collision de code de réservation).
 * - 23P01 : violation de la contrainte d'exclusion, c'est-à-dire deux
 *   rendez-vous qui se chevauchent — le créneau vient d'être pris.
 */
const UNIQUE_VIOLATION = "23505";
const EXCLUSION_VIOLATION = "23P01";

function pgCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export async function createBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // 1. Limitation de débit avant tout travail : une adresse ne peut pas
  //    saturer le planning ni sonder les créneaux en boucle.
  const ip = await clientIp();
  const ipLimit = await rateLimit({
    key: `booking:ip:${await hashKey(ip)}`,
    limit: 10,
    windowSec: 3600,
  });
  if (!ipLimit.ok) {
    return errorState("Trop de tentatives. Réessayez dans quelques minutes.");
  }

  const parsed = createBookingSchema.safeParse({
    serviceId: formData.get("serviceId"),
    day: formData.get("day"),
    minutes: formData.get("minutes"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return errorState("Vérifiez les informations saisies.", fieldErrors(parsed.error));
  }
  const input = parsed.data;

  // Seconde limite, sur le numéro : empêche de réserver dix créneaux depuis
  // dix adresses différentes avec le même téléphone.
  const phoneLimit = await rateLimit({
    key: `booking:phone:${await hashKey(input.contactPhone)}`,
    limit: 5,
    windowSec: 24 * 3600,
  });
  if (!phoneLimit.ok) {
    return errorState(
      "Ce numéro a déjà plusieurs réservations en cours. Contactez le salon par téléphone.",
    );
  }

  const [service, settings, rules, closures] = await Promise.all([
    getServiceById(input.serviceId),
    getSettings(),
    getOpeningRules(),
    getUpcomingClosures(),
  ]);

  if (!service || !service.isActive) {
    return errorState("Cette prestation n'est plus proposée.");
  }

  const startsAt = salonWallClockToInstant(input.day, input.minutes);
  const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);
  const now = new Date();

  // 2. Fenêtre de réservation. Revalidée serveur : le formulaire ne propose
  //    que des dates valides, mais rien n'oblige le client à passer par lui.
  if (startsAt.getTime() < now.getTime() + settings.minAdvanceMin * 60_000) {
    return errorState("Ce créneau est trop proche. Choisissez un horaire plus tardif.");
  }
  const lastBookableDay = addDaysToKey(todayKey(now), settings.maxAdvanceDays);
  if (input.day > lastBookableDay) {
    return errorState(`Les réservations sont ouvertes jusqu'au ${lastBookableDay}.`);
  }

  // 3. Le créneau doit correspondre à un horaire réellement proposé : sans
  //    cette vérification, un POST forgé pourrait réserver à 3 h du matin.
  const validSlot = isValidSlotStart({
    startsAt,
    rules,
    closures,
    serviceDurationMin: service.durationMin,
    slotIntervalMin: settings.slotIntervalMin,
    day: input.day,
  });
  if (!validSlot) {
    return errorState("Le salon est fermé sur ce créneau. Choisissez un autre horaire.");
  }

  // Rattachement au compte si le client est connecté : c'est ce qui alimente
  // la fidélité et les statistiques par client.
  const customer = await getCustomer();

  const db = getDb();

  // 4. Insertion. La contrainte d'exclusion en base tranche les cas de
  //    concurrence : deux clients sur le même créneau, un seul passe.
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = generateReference();
    try {
      await db.insert(schema.bookings).values({
        reference,
        customerId: customer?.id ?? null,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        serviceId: service.id,
        startsAt,
        endsAt,
        status: "pending",
        priceMillimes: service.priceMillimes,
        notes: input.notes,
      });

      revalidatePath("/reserver");
      revalidatePath("/admin");
      revalidatePath("/admin/reservations");
      if (customer) revalidatePath("/compte");

      // Attendue (pas fire-and-forget) : une fonction serverless peut être
      // arrêtée dès la réponse envoyée, une promesse non attendue risquerait
      // de ne jamais s'exécuter. Les erreurs sont avalées à l'intérieur de
      // `sendAdminNotification`, donc la réservation ne peut pas échouer à
      // cause d'un souci d'e-mail.
      await sendAdminNotification(
        newBookingEmail({
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          serviceName: service.name,
          dateLabel: formatDateTime(startsAt),
          priceLabel: formatPrice(service.priceMillimes),
          notes: input.notes,
          reference,
        }),
      );

      return successState(
        "Votre demande est enregistrée. Le salon la confirmera rapidement.",
        { reference, day: input.day, minutes: String(input.minutes) },
      );
    } catch (error) {
      const code = pgCode(error);
      if (code === EXCLUSION_VIOLATION) {
        return errorState(
          "Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez-en un autre.",
        );
      }
      // Collision de code : on retire au sort et on retente.
      if (code === UNIQUE_VIOLATION && attempt < 4) continue;
      throw error;
    }
  }

  return errorState("Impossible d'enregistrer la réservation. Réessayez.");
}

/**
 * Consultation sans compte : le numéro de téléphone seul suffit à retrouver
 * les réservations qui lui sont associées (peut en renvoyer plusieurs).
 *
 * Sans code secret pour authentifier la requête, le numéro tient lieu de
 * seule preuve — quiconque connaît le numéro d'un client peut voir ses
 * rendez-vous. C'est un choix assumé pour un salon de quartier ; la limite de
 * débit ci-dessous freine le sondage en masse de numéros, pas la
 * consultation d'un numéro déjà connu de l'attaquant.
 */
export async function lookupBookingAction(
  _prev: LookupState,
  formData: FormData,
): Promise<LookupState> {
  const ip = await clientIp();
  const limit = await rateLimit({
    key: `lookup:ip:${await hashKey(ip)}`,
    limit: 15,
    windowSec: 900,
  });
  if (!limit.ok) {
    return { status: "error", message: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const parsed = bookingLookupSchema.safeParse({ phone: formData.get("phone") });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifiez le numéro de téléphone.",
      errors: fieldErrors(parsed.error),
    };
  }

  const bookings = await findBookingsByPhone(parsed.data.phone);
  if (bookings.length === 0) {
    return { status: "error", message: "Aucune réservation ne correspond à ce numéro." };
  }

  return {
    status: "success",
    message: `${bookings.length} réservation${bookings.length > 1 ? "s" : ""} trouvée${bookings.length > 1 ? "s" : ""}.`,
    bookings: bookings.map((b) => ({
      id: b.id,
      reference: b.reference,
      status: b.status,
      serviceName: b.serviceName,
      startsAt: b.startsAt.toISOString(),
      priceMillimes: b.priceMillimes,
    })),
  };
}

/** Annulation par le client (invité ou connecté) : identifie la réservation par id + téléphone. */
export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = bookingCancelSchema.safeParse({
    bookingId: formData.get("bookingId"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return errorState("Requête invalide.");
  }

  const ip = await clientIp();
  const limit = await rateLimit({
    key: `cancel:ip:${await hashKey(ip)}`,
    limit: 15,
    windowSec: 900,
  });
  if (!limit.ok) return errorState("Trop de tentatives. Réessayez plus tard.");

  const db = getDb();
  // La condition de propriété (id + téléphone) est dans le WHERE : aucune
  // ligne n'est modifiée si elle n'est pas satisfaite.
  const updated = await db
    .update(schema.bookings)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.bookings.id, parsed.data.bookingId),
        eq(schema.bookings.contactPhone, parsed.data.phone),
        inArray(schema.bookings.status, ["pending", "confirmed"]),
      ),
    )
    .returning({ id: schema.bookings.id });

  if (updated.length === 0) {
    return errorState("Cette réservation est introuvable ou ne peut plus être annulée.");
  }

  revalidatePath("/reserver");
  revalidatePath("/ma-reservation");
  revalidatePath("/compte");
  revalidatePath("/admin");
  revalidatePath("/admin/reservations");

  return successState("Votre rendez-vous a été annulé.");
}
