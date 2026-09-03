import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { ActionState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

/**
 * Bandeau de retour d'une Server Action. `aria-live="polite"` annonce le
 * message aux lecteurs d'écran sans lui voler le focus (contrairement à
 * `assertive`, qui interromprait la lecture en cours).
 */
export function FormAlert({ state, className }: { state: ActionState; className?: string }) {
  if (state.status === "idle" || !state.message) return null;

  const isError = state.status === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-2.5 rounded-sm border px-4 py-3 text-sm",
        isError ? "border-danger/40 bg-danger-bg text-danger" : "border-success/40 bg-success-bg text-success",
        className,
      )}
    >
      {isError ? (
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      )}
      <span>{state.message}</span>
    </div>
  );
}
