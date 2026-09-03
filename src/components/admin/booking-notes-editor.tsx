"use client";

import { useActionState, useState } from "react";
import { Check, StickyNote } from "lucide-react";

import { updateBookingNotesAction } from "@/lib/actions/admin";
import { idleState } from "@/lib/actions/types";
import { SubmitButton } from "@/components/submit-button";

export function BookingNotesEditor({ bookingId, initialNotes }: { bookingId: string; initialNotes: string }) {
  const [state, formAction] = useActionState(updateBookingNotesAction, idleState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 text-xs text-stone transition-colors hover:text-brass"
      >
        <StickyNote size={12} aria-hidden="true" />
        {initialNotes ? "Voir la note" : "Ajouter une note"}
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <textarea
        name="adminNotes"
        defaultValue={initialNotes}
        rows={2}
        placeholder="Note interne (non visible par le client)…"
        className="min-h-16 w-full rounded-sm border border-stone/30 bg-charcoal px-3 py-2 text-sm text-ivory placeholder:text-stone/50 focus:border-brass focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <SubmitButton size="sm">
          <Check size={13} aria-hidden="true" />
          Enregistrer
        </SubmitButton>
        {state.status === "success" && <span className="text-xs text-success">Enregistré.</span>}
      </div>
    </form>
  );
}
