import { CalendarCheck, CalendarClock, CalendarX, CheckCircle2, UserX } from "lucide-react";

import type { BookingStatus } from "@/lib/db/schema";
import { BOOKING_STATUS_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Icône + couleur + texte pour chaque statut : ne jamais coder l'information
 * sur la seule couleur (daltonisme, WCAG 1.4.1).
 */
const STATUS_STYLE: Record<BookingStatus, { icon: typeof CalendarClock; className: string }> = {
  pending: { icon: CalendarClock, className: "bg-warning-bg text-warning" },
  confirmed: { icon: CalendarCheck, className: "bg-info-bg text-info" },
  completed: { icon: CheckCircle2, className: "bg-success-bg text-success" },
  cancelled: { icon: CalendarX, className: "bg-charcoal-line text-stone" },
  no_show: { icon: UserX, className: "bg-danger-bg text-danger" },
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const { icon: Icon, className: styleClass } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        styleClass,
        className,
      )}
    >
      <Icon size={13} aria-hidden="true" />
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}
