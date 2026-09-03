"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";

import { signupAction } from "@/lib/actions/auth";
import { idleState } from "@/lib/actions/types";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/submit-button";
import { FormAlert } from "@/components/form-alert";

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TextField
        label="Nom complet"
        name="fullName"
        autoComplete="name"
        error={state.errors?.fullName}
        required
      />
      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        error={state.errors?.email}
        required
      />
      <TextField
        label="Téléphone"
        name="phone"
        type="tel"
        inputMode="tel"
        placeholder="50 882 529"
        autoComplete="tel"
        error={state.errors?.phone}
        required
      />
      <TextField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="10 caractères minimum, avec au moins une lettre et un chiffre"
        error={state.errors?.password}
        required
      />
      <FormAlert state={state} />
      <SubmitButton className="mt-2">
        <UserPlus size={16} aria-hidden="true" />
        Créer mon compte
      </SubmitButton>
    </form>
  );
}
