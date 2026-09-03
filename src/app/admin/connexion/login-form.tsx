"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";

import { adminLoginAction } from "@/lib/actions/auth";
import { idleState } from "@/lib/actions/types";
import { TextField } from "@/components/ui/field";
import { SubmitButton } from "@/components/submit-button";
import { FormAlert } from "@/components/form-alert";

export function AdminLoginForm() {
  const [state, formAction] = useActionState(adminLoginAction, idleState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <TextField
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormAlert state={state} />
      <SubmitButton className="mt-2">
        <LogIn size={16} aria-hidden="true" />
        Se connecter
      </SubmitButton>
    </form>
  );
}
