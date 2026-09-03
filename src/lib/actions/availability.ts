"use server";

import { getAvailability, getServiceById } from "@/lib/data";
import { clientIp, hashKey, rateLimit } from "@/lib/rate-limit";
import { dayKeySchema } from "@/lib/validation";
import type { DayAvailability } from "@/lib/data";

/**
 * Appelée directement depuis le composant client de réservation (pas de
 * `<form>`) à chaque changement de prestation ou de semaine affichée.
 *
 * Limitée par IP : c'est un point d'entrée non authentifié qui déclenche une
 * requête base de données, il ne doit pas pouvoir être sondé en boucle.
 */
export async function fetchAvailabilityAction(
  serviceId: string,
  fromDay: string,
  days: number,
): Promise<{ ok: true; availability: DayAvailability[] } | { ok: false; error: string }> {
  const ip = await clientIp();
  const limit = await rateLimit({
    key: `availability:ip:${await hashKey(ip)}`,
    limit: 120,
    windowSec: 3600,
  });
  if (!limit.ok) return { ok: false, error: "Trop de requêtes. Patientez un instant." };

  const parsedDay = dayKeySchema.safeParse(fromDay);
  if (!parsedDay.success || days < 1 || days > 14) {
    return { ok: false, error: "Requête invalide." };
  }

  const service = await getServiceById(serviceId);
  if (!service || !service.isActive) {
    return { ok: false, error: "Prestation introuvable." };
  }

  const availability = await getAvailability({
    serviceDurationMin: service.durationMin,
    fromDay: parsedDay.data,
    days,
  });

  return { ok: true, availability };
}
