"use client";

import { useActionState } from "react";

import { updateBookingStatusAction } from "@/lib/actions/admin";
import { idleState } from "@/lib/actions/types";
import type { BookingStatus } from "@/lib/db/schema";
import { BOOKING_STATUS_LABELS } from "@/lib/utils";

const OPTIONS: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no_show"];

/**
 * Select qui soumet immédiatement au changement plutôt qu'un bouton séparé :
 * c'est l'action la plus fréquente du dashboard, elle doit prendre un clic.
 */
export function BookingStatusControl({ bookingId, status }: { bookingId: string; status: BookingStatus }) {
  const [state, formAction] = useActionState(updateBookingStatusAction, idleState);

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="sr-only" htmlFor={`status-${bookingId}`}>
        Statut du rendez-vous
      </label>
      <select
        id={`status-${bookingId}`}
        name="status"
        defaultValue={status}
        onChange={(e) => {
          e.currentTarget.form?.requestSubmit();
        }}
        className="min-h-9 cursor-pointer rounded-sm border border-stone/30 bg-charcoal px-2.5 py-1.5 text-xs text-ivory focus:border-brass focus:outline-none"
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {BOOKING_STATUS_LABELS[opt]}
          </option>
        ))}
      </select>
      {state.status === "error" && (
        <span role="alert" className="text-xs text-danger">
          {state.message}
        </span>
      )}
    </form>
  );
}
