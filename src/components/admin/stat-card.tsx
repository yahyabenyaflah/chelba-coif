import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="rounded-sm border border-brass-soft/30 bg-charcoal-raised p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone">{label}</span>
        <Icon
          size={16}
          className={cn(
            tone === "warning" && "text-warning",
            tone === "danger" && "text-danger",
            tone === "default" && "text-brass",
          )}
          aria-hidden="true"
        />
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone">{hint}</p>}
    </div>
  );
}
