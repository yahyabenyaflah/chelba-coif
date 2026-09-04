"use client";

import { useActionState, useState } from "react";
import { CalendarDays, Search, XCircle } from "lucide-react";

import { cancelBookingAction, lookupBookingAction } from "@/lib/actions/booking";
import { idleLookupState, idleState, type LookedUpBooking } from "@/lib/actions/types";
import { formatDateTime } from "@/lib/time";
import { formatPrice } from "@/lib/utils";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/submit-button";
import { FormAlert } from "@/components/form-alert";
import { StatusBadge } from "@/components/ui/badge";

export function LookupForm() {
  const [lookupState, lookupAction] = useActionState(lookupBookingAction, idleLookupState);
  const [phone, setPhone] = useState("");

  const bookings = lookupState.status === "success" ? lookupState.bookings : undefined;

  return (
    <div className="rise-in">
      {!bookings ? (
        <form action={lookupAction} className="flex flex-col gap-4">
          <TextField
            label="Numéro de téléphone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="50 882 529"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={lookupState.errors?.phone}
            required
          />
          <FormAlert state={lookupState} />
          <SubmitButton className="mt-2 self-start">
            <Search size={16} aria-hidden="true" />
            Rechercher
          </SubmitButton>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} phone={phone} />
          ))}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer self-start text-sm text-stone underline-offset-2 hover:text-ivory hover:underline"
          >
            Nouvelle recherche
          </button>
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking, phone }: { booking: LookedUpBooking; phone: string }) {
  const [cancelState, cancelAction] = useActionState(cancelBookingAction, idleState);

  if (cancelState.status === "success") return null;

  const cancellable = booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="font-medium">{booking.serviceName}</p>
        <StatusBadge status={booking.status} />
      </div>
      <dl className="mt-3 space-y-2 text-sm text-stone">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={14} aria-hidden="true" />
          <dd className="text-ivory">{formatDateTime(new Date(booking.startsAt))}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Montant</dt>
          <dd className="text-ivory">{formatPrice(booking.priceMillimes)}</dd>
        </div>
      </dl>

      {cancellable ? (
        <form action={cancelAction} className="mt-4 flex flex-col gap-3">
          <input type="hidden" name="bookingId" value={booking.id} />
          <input type="hidden" name="phone" value={phone} />
          <FormAlert state={cancelState} />
          <SubmitButton variant="danger" size="sm" className="self-start">
            <XCircle size={14} aria-hidden="true" />
            Annuler ce rendez-vous
          </SubmitButton>
        </form>
      ) : (
        <p className="mt-4 text-xs text-stone">Ce rendez-vous ne peut plus être annulé en ligne.</p>
      )}
    </div>
  );
}
