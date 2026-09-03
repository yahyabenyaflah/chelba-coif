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
  findBookingByReference,
} from "@/lib/data";
import { isValidSlotStart } from "@/lib/booking/slots";
import { clientIp, hashKey, rateLimit } from "@/lib/rate-limit";
import { addDaysToKey, salonWallClockToInstant, todayKey } from "@/lib/time";
import { generateReference } from "@/lib/utils";
import { bookingLookupSchema, createBookingSchema, fieldErrors } from "@/lib/validation";
import { errorState, successState, type ActionState } from "./types";

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

/** Consultation d'une réservation sans compte : code + téléphone. */
export async function lookupBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clientIp();
  // Limite serrée : le couple code + téléphone tient lieu de mot de passe,
  // il ne doit pas pouvoir être deviné par énumération.
  const limit = await rateLimit({
    key: `lookup:ip:${await hashKey(ip)}`,
    limit: 15,
    windowSec: 900,
  });
  if (!limit.ok) {
    return errorState("Trop de tentatives. Réessayez dans quelques minutes.");
  }

  const parsed = bookingLookupSchema.safeParse({
    reference: formData.get("reference"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return errorState("Vérifiez le code et le numéro.", fieldErrors(parsed.error));
  }

  const booking = await findBookingByReference(parsed.data.reference, parsed.data.phone);
  if (!booking) {
    // Message unique : ne révèle pas si c'est le code ou le numéro qui cloche.
    return errorState("Aucune réservation ne correspond à ce code et ce numéro.");
  }

  return successState("Réservation trouvée.", {
    reference: booking.reference,
    status: booking.status,
    serviceName: booking.serviceName,
    startsAt: booking.startsAt.toISOString(),
    priceMillimes: String(booking.priceMillimes),
    phone: parsed.data.phone,
  });
}

/** Annulation par le client (invité ou connecté). */
export async function cancelBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = bookingLookupSchema.safeParse({
    reference: formData.get("reference"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return errorState("Vérifiez le code et le numéro.", fieldErrors(parsed.error));
  }

  const ip = await clientIp();
  const limit = await rateLimit({
    key: `cancel:ip:${await hashKey(ip)}`,
    limit: 15,
    windowSec: 900,
  });
  if (!limit.ok) return errorState("Trop de tentatives. Réessayez plus tard.");

  const db = getDb();
  // La condition de propriété (code + téléphone) est dans le WHERE : aucune
  // ligne n'est modifiée si elle n'est pas satisfaite.
  const updated = await db
    .update(schema.bookings)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.bookings.reference, parsed.data.reference),
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
