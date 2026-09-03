"use client";

import { useActionState, useState } from "react";
import { CalendarDays, Search, XCircle } from "lucide-react";

import { cancelBookingAction, lookupBookingAction } from "@/lib/actions/booking";
import { idleState } from "@/lib/actions/types";
import type { BookingStatus } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/time";
import { formatPrice } from "@/lib/utils";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/submit-button";
import { FormAlert } from "@/components/form-alert";
import { StatusBadge } from "@/components/ui/badge";

export function LookupForm() {
  const [lookupState, lookupAction] = useActionState(lookupBookingAction, idleState);
  const [cancelState, cancelAction] = useActionState(cancelBookingAction, idleState);
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");

  // Après une annulation réussie, on ne peut plus rien afficher de l'ancienne
  // consultation : elle refléterait un état obsolète.
  const booking = cancelState.status === "success" ? null : lookupState.data;
  const cancellable = booking && (booking.status === "pending" || booking.status === "confirmed");

  return (
    <div className="rise-in">
      {!booking ? (
        <form action={lookupAction} className="flex flex-col gap-4">
          <TextField
            label="Code de réservation"
            name="reference"
            placeholder="K7P2QM"
            autoComplete="off"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            error={lookupState.errors?.reference}
            required
          />
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
        <div className="flex flex-col gap-6">
          <div className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-semibold tracking-[0.15em] text-brass">
                  {booking.reference}
                </p>
                <p className="mt-1 font-medium">{booking.serviceName}</p>
              </div>
              <StatusBadge status={booking.status as BookingStatus} />
            </div>
            <dl className="mt-4 space-y-2 text-sm text-stone">
              <div className="flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" />
                <dd className="text-ivory">{formatDateTime(new Date(booking.startsAt))}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Montant</dt>
                <dd className="text-ivory">{formatPrice(Number(booking.priceMillimes))}</dd>
              </div>
            </dl>
          </div>

          {cancellable && (
            <form action={cancelAction} className="flex flex-col gap-3">
              <input type="hidden" name="reference" value={booking.reference} />
              <input type="hidden" name="phone" value={booking.phone} />
              <FormAlert state={cancelState} />
              <CancelButton />
            </form>
          )}

          {!cancellable && cancelState.status !== "success" && (
            <p className="text-sm text-stone">Ce rendez-vous ne peut plus être annulé en ligne.</p>
          )}

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

function CancelButton() {
  return (
    <SubmitButton variant="danger" className="self-start">
      <XCircle size={16} aria-hidden="true" />
      Annuler ce rendez-vous
    </SubmitButton>
  );
}
