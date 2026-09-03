import type { Metadata } from "next";
import { Phone } from "lucide-react";

import { getBookingsBetween } from "@/lib/data";
import { formatDateTime } from "@/lib/time";
import { formatPhone, formatPrice } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/badge";
import { BookingStatusControl } from "@/components/admin/booking-status-control";
import { BookingNotesEditor } from "@/components/admin/booking-notes-editor";

export const metadata: Metadata = { title: "Réservations" };

const WINDOW_PAST_DAYS = 30;
const WINDOW_FUTURE_DAYS = 90;

export default async function ReservationsPage() {
  const now = new Date();
  const from = new Date(now.getTime() - WINDOW_PAST_DAYS * 86_400_000);
  const to = new Date(now.getTime() + WINDOW_FUTURE_DAYS * 86_400_000);

  const bookings = await getBookingsBetween(from, to);
  // Les plus proches en premier, passés en dernier.
  const sorted = [...bookings].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Réservations</h1>
      <p className="mt-1 text-stone">
        {WINDOW_PAST_DAYS} jours passés — {WINDOW_FUTURE_DAYS} jours à venir.
      </p>

      {sorted.length === 0 ? (
        <p className="mt-8 text-stone">Aucune réservation sur cette période.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {sorted.map((b) => (
            <li key={b.id} className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ivory">{b.contactName}</p>
                  <a
                    href={`tel:${b.contactPhone}`}
                    className="flex items-center gap-1.5 text-sm text-stone transition-colors hover:text-brass"
                  >
                    <Phone size={12} aria-hidden="true" />
                    {formatPhone(b.contactPhone)}
                  </a>
                </div>
                <div className="text-right">
                  <p className="text-ivory">{b.serviceName}</p>
                  <p className="text-sm text-stone">{formatDateTime(b.startsAt)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={b.status} />
                  <span className="font-display text-brass">{formatPrice(b.priceMillimes)}</span>
                </div>
                <BookingStatusControl bookingId={b.id} status={b.status} />
              </div>

              {b.notes && (
                <p className="mt-3 rounded-sm bg-charcoal p-2.5 text-sm text-stone">
                  <span className="text-xs uppercase tracking-wide text-djerba-blue">Note du client — </span>
                  {b.notes}
                </p>
              )}

              <div className="mt-3">
                <BookingNotesEditor bookingId={b.id} initialNotes={b.adminNotes} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
