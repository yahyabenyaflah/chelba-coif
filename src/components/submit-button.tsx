"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * `useFormStatus` ne lit que l'état du `<form>` ancêtre le plus proche : ce
 * composant doit donc être un enfant du `<form>`, jamais le formulaire
 * lui-même.
 */
export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending && <Loader2 className="animate-spin" size={16} aria-hidden="true" />}
      {children}
    </Button>
  );
}
