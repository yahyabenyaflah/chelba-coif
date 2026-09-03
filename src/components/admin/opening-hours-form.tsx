"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";

import { saveOpeningHoursAction } from "@/lib/actions/admin";
import { idleState } from "@/lib/actions/types";
import type { OpeningRule } from "@/lib/booking/slots";
import { WEEKDAY_LABELS } from "@/lib/time";
import { SubmitButton } from "@/components/submit-button";
import { FormAlert } from "@/components/form-alert";
import { cn } from "@/lib/utils";

export function OpeningHoursForm({ hours }: { hours: OpeningRule[] }) {
  const [state, formAction] = useActionState(saveOpeningHoursAction, idleState);
  const [closedDays, setClosedDays] = useState<Set<number>>(
    new Set(hours.filter((h) => h.isClosed).map((h) => h.weekday)),
  );

  const sorted = [...hours].sort((a, b) => a.weekday - b.weekday);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {sorted.map((h) => {
        const closed = closedDays.has(h.weekday);
        return (
          <div
            key={h.weekday}
            className={cn(
              "grid grid-cols-2 items-center gap-3 rounded-sm border border-brass-soft/20 p-3 sm:grid-cols-[7rem_auto_1fr_1fr]",
              closed && "opacity-50",
            )}
          >
            <span className="text-sm font-medium">{WEEKDAY_LABELS[h.weekday]}</span>

            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-stone">
              <input
                type="checkbox"
                name={`isClosed-${h.weekday}`}
                defaultChecked={closed}
                onChange={(e) => {
                  setClosedDays((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(h.weekday);
                    else next.delete(h.weekday);
                    return next;
                  });
                }}
                className="h-4 w-4 accent-brass"
              />
              Fermé
            </label>

            <label className="flex flex-col gap-0.5 text-xs text-stone">
              Ouverture
              <input
                type="time"
                name={`opensAt-${h.weekday}`}
                defaultValue={h.opensAt.slice(0, 5)}
                disabled={closed}
                className="min-h-9 rounded-sm border border-stone/30 bg-charcoal px-2 py-1.5 text-sm text-ivory disabled:opacity-40"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs text-stone">
              Fermeture
              <input
                type="time"
                name={`closesAt-${h.weekday}`}
                defaultValue={h.closesAt.slice(0, 5)}
                disabled={closed}
                className="min-h-9 rounded-sm border border-stone/30 bg-charcoal px-2 py-1.5 text-sm text-ivory disabled:opacity-40"
              />
            </label>

            <span className="hidden sm:block" aria-hidden="true" />
            <span className="text-xs text-stone">Pause (facultative)</span>
            <label className="flex flex-col gap-0.5 text-xs text-stone">
              Début
              <input
                type="time"
                name={`breakStart-${h.weekday}`}
                defaultValue={h.breakStart?.slice(0, 5) ?? ""}
                disabled={closed}
                className="min-h-9 rounded-sm border border-stone/30 bg-charcoal px-2 py-1.5 text-sm text-ivory disabled:opacity-40"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs text-stone">
              Fin
              <input
                type="time"
                name={`breakEnd-${h.weekday}`}
                defaultValue={h.breakEnd?.slice(0, 5) ?? ""}
                disabled={closed}
                className="min-h-9 rounded-sm border border-stone/30 bg-charcoal px-2 py-1.5 text-sm text-ivory disabled:opacity-40"
              />
            </label>

            {state.errors?.[`opensAt-${h.weekday}`] && (
              <p className="col-span-full text-xs text-danger">{state.errors[`opensAt-${h.weekday}`]}</p>
            )}
            {state.errors?.[`closesAt-${h.weekday}`] && (
              <p className="col-span-full text-xs text-danger">{state.errors[`closesAt-${h.weekday}`]}</p>
            )}
            {state.errors?.[`breakEnd-${h.weekday}`] && (
              <p className="col-span-full text-xs text-danger">{state.errors[`breakEnd-${h.weekday}`]}</p>
            )}
          </div>
        );
      })}

      <FormAlert state={state} className="mt-2" />

      <SubmitButton className="mt-2 self-start">
        <Check size={16} aria-hidden="true" />
        Enregistrer les horaires
      </SubmitButton>
    </form>
  );
}
