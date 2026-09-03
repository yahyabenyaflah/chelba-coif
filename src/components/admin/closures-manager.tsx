"use client";

import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { addClosureAction, deleteClosureAction } from "@/lib/actions/admin";
import { idleState } from "@/lib/actions/types";
import type { Closure } from "@/lib/db/schema";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/submit-button";
import { FormAlert } from "@/components/form-alert";

export function ClosuresManager({ closures }: { closures: Closure[] }) {
  const [addState, addAction] = useActionState(addClosureAction, idleState);

  const upcoming = closures.filter((c) => c.endDate >= todayIso());

  return (
    <div className="flex flex-col gap-6">
      <form action={addAction} className="grid gap-3 sm:grid-cols-3">
        <TextField label="Du" name="startDate" type="date" error={addState.errors?.startDate} required />
        <TextField label="Au" name="endDate" type="date" error={addState.errors?.endDate} required />
        <TextField label="Motif (facultatif)" name="reason" placeholder="Congés, jour férié…" error={addState.errors?.reason} />
        <div className="sm:col-span-3">
          <FormAlert state={addState} className="mb-3" />
          <SubmitButton size="sm">
            <Plus size={14} aria-hidden="true" />
            Ajouter une fermeture
          </SubmitButton>
        </div>
      </form>

      <ul className="flex flex-col gap-2">
        {upcoming.length === 0 && <li className="text-sm text-stone">Aucune fermeture à venir.</li>}
        {upcoming.map((c) => (
          <ClosureRow key={c.id} closure={c} />
        ))}
      </ul>
    </div>
  );
}

function ClosureRow({ closure }: { closure: Closure }) {
  const [state, formAction] = useActionState(deleteClosureAction, idleState);
  if (state.status === "success") return null;

  return (
    <li className="flex items-center justify-between rounded-sm border border-brass-soft/20 px-4 py-2.5 text-sm">
      <span>
        {closure.startDate === closure.endDate
          ? closure.startDate
          : `${closure.startDate} → ${closure.endDate}`}
        {closure.reason && <span className="ml-2 text-stone">— {closure.reason}</span>}
      </span>
      <form action={formAction}>
        <input type="hidden" name="closureId" value={closure.id} />
        <button
          type="submit"
          aria-label="Supprimer cette fermeture"
          className="cursor-pointer text-stone transition-colors hover:text-danger"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </form>
    </li>
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
