"use client";

import { useActionState } from "react";

import { toggleServiceAction } from "@/lib/actions/admin";
import { idleState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

export function ServiceToggle({ serviceId, isActive }: { serviceId: string; isActive: boolean }) {
  const [, formAction] = useActionState(toggleServiceAction, idleState);

  return (
    <form action={formAction}>
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="isActive" value={isActive ? "" : "on"} />
      <button
        type="submit"
        role="switch"
        aria-checked={isActive}
        aria-label={isActive ? "Masquer la prestation" : "Réactiver la prestation"}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
          isActive ? "bg-brass" : "bg-charcoal-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-ivory transition-transform",
            isActive ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </form>
  );
}
