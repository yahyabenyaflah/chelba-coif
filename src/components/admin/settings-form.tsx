"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";

import { saveSettingsAction } from "@/lib/actions/admin";
import { idleState } from "@/lib/actions/types";
import type { SalonSettings } from "@/lib/db/schema";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/submit-button";
import { FormAlert } from "@/components/form-alert";

export function SettingsForm({ settings }: { settings: SalonSettings }) {
  const [state, formAction] = useActionState(saveSettingsAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-display text-lg font-semibold">Salon</legend>
        <TextField label="Nom du salon" name="salonName" defaultValue={settings.salonName} error={state.errors?.salonName} required />
        <TextField
          label="Téléphone"
          name="phone"
          type="tel"
          defaultValue={settings.phone.replace(/^\+216/, "")}
          error={state.errors?.phone}
          required
        />
        <TextField label="Adresse" name="address" defaultValue={settings.address} error={state.errors?.address} required />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-display text-lg font-semibold">Réservations</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Intervalle des créneaux (min)"
            name="slotIntervalMin"
            type="number"
            min={5}
            max={120}
            defaultValue={settings.slotIntervalMin}
            error={state.errors?.slotIntervalMin}
            required
          />
          <TextField
            label="Réservable jusqu'à (jours)"
            name="maxAdvanceDays"
            type="number"
            min={1}
            max={365}
            defaultValue={settings.maxAdvanceDays}
            error={state.errors?.maxAdvanceDays}
            required
          />
          <TextField
            label="Délai minimum (minutes)"
            name="minAdvanceMin"
            type="number"
            min={0}
            defaultValue={settings.minAdvanceMin}
            error={state.errors?.minAdvanceMin}
            hint="Avant le début du créneau"
            required
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 font-display text-lg font-semibold">Fidélité</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Points gagnés par visite"
            name="pointsPerVisit"
            type="number"
            min={0}
            defaultValue={settings.pointsPerVisit}
            error={state.errors?.pointsPerVisit}
            required
          />
          <TextField
            label="Points requis pour la récompense"
            name="pointsForReward"
            type="number"
            min={1}
            defaultValue={settings.pointsForReward}
            error={state.errors?.pointsForReward}
            required
          />
        </div>
        <TextField
          label="Libellé de la récompense"
          name="rewardLabel"
          defaultValue={settings.rewardLabel}
          error={state.errors?.rewardLabel}
          required
        />
      </fieldset>

      <FormAlert state={state} />

      <SubmitButton className="self-start">
        <Check size={16} aria-hidden="true" />
        Enregistrer
      </SubmitButton>
    </form>
  );
}
