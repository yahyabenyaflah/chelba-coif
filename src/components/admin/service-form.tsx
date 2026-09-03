"use client";

import { useActionState, useEffect } from "react";
import { Check, Plus } from "lucide-react";

import { saveServiceAction } from "@/lib/actions/admin";
import { idleState } from "@/lib/actions/types";
import { millimesToDt } from "@/lib/utils";
import type { Service } from "@/lib/db/schema";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/submit-button";
import { FormAlert } from "@/components/form-alert";

export function ServiceForm({ service, onSaved }: { service?: Service; onSaved?: () => void }) {
  const [state, formAction] = useActionState(saveServiceAction, idleState);

  // Effet plutôt qu'un appel direct pendant le rendu : `onSaved` déclenche
  // typiquement une mise à jour d'état côté parent (fermer le formulaire),
  // ce qui doit arriver après le rendu, pas pendant.
  useEffect(() => {
    if (state.status === "success") onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {service && <input type="hidden" name="serviceId" value={service.id} />}
      {!service && <input type="hidden" name="isActive" value="on" />}

      <TextField
        label="Nom de la prestation"
        name="name"
        defaultValue={service?.name}
        error={state.errors?.name}
        required
      />
      <TextField
        label="Description (facultative)"
        name="description"
        defaultValue={service?.description}
        error={state.errors?.description}
      />
      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Durée (minutes)"
          name="durationMin"
          type="number"
          min={5}
          max={480}
          defaultValue={service?.durationMin ?? 30}
          error={state.errors?.durationMin}
          required
        />
        <TextField
          label="Prix (DT)"
          name="priceDt"
          type="number"
          min={0}
          step={0.1}
          defaultValue={service ? millimesToDt(service.priceMillimes) : undefined}
          error={state.errors?.priceDt}
          required
        />
      </div>

      {service && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ivory">
          <input type="checkbox" name="isActive" defaultChecked={service.isActive} className="h-4 w-4 accent-brass" />
          Visible pour les clients
        </label>
      )}

      <FormAlert state={state} />

      <SubmitButton className="self-start">
        {service ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        {service ? "Enregistrer" : "Ajouter la prestation"}
      </SubmitButton>
    </form>
  );
}
