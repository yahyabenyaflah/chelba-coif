"use client";

import { useActionState } from "react";
import { Gift } from "lucide-react";

import { redeemRewardAction } from "@/lib/actions/admin";
import { idleState } from "@/lib/actions/types";
import { SubmitButton } from "@/components/submit-button";

export function RedeemRewardButton({ customerId, rewardLabel }: { customerId: string; rewardLabel: string }) {
  const [state, formAction] = useActionState(redeemRewardAction, idleState);

  if (state.status === "success") {
    return <span className="text-xs text-success">Récompense utilisée</span>;
  }

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="customerId" value={customerId} />
      <SubmitButton size="sm" variant="outline" title={`Marquer « ${rewardLabel} » comme utilisée`}>
        <Gift size={13} aria-hidden="true" />
        Récompense
      </SubmitButton>
      {state.status === "error" && <span className="text-xs text-danger">{state.message}</span>}
    </form>
  );
}
