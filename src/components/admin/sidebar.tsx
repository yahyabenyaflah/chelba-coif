"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  Clock,
  Images,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  Users,
} from "lucide-react";

import { adminLogoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/reservations", label: "Réservations", icon: CalendarClock },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/prestations", label: "Prestations", icon: Scissors },
  { href: "/admin/galerie", label: "Galerie", icon: Images },
  { href: "/admin/horaires", label: "Horaires", icon: Clock },
  { href: "/admin/parametres", label: "Réglages", icon: Settings },
] as const;

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop : colonne fixe. */}
      <nav
        className="hidden h-full w-60 shrink-0 flex-col border-r border-brass-soft/30 bg-charcoal-raised px-3 py-6 md:flex"
        aria-label="Navigation administration"
      >
        <div className="px-3 pb-6">
          <p className="text-xs uppercase tracking-wide text-stone">Connecté en tant que</p>
          <p className="mt-0.5 truncate font-medium text-ivory">{adminName}</p>
        </div>

        <ul className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                    active ? "bg-brass text-charcoal" : "text-stone hover:bg-charcoal hover:text-ivory",
                  )}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <form action={adminLogoutAction} className="mt-4 px-1">
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-stone transition-colors hover:bg-charcoal hover:text-ivory"
          >
            <LogOut size={16} aria-hidden="true" />
            Déconnexion
          </button>
        </form>
      </nav>

      {/* Mobile : barre horizontale déroulante. */}
      <nav
        className="scroll-x sticky top-0 z-10 flex gap-1 border-b border-brass-soft/30 bg-charcoal-raised px-3 py-2 md:hidden"
        aria-label="Navigation administration"
      >
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-2 text-xs transition-colors",
                active ? "bg-brass text-charcoal" : "text-stone hover:bg-charcoal hover:text-ivory",
              )}
            >
              <Icon size={14} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <form action={adminLogoutAction} className="shrink-0">
          <button
            type="submit"
            className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-2 text-xs text-stone transition-colors hover:bg-charcoal hover:text-ivory"
          >
            <LogOut size={14} aria-hidden="true" />
            Sortir
          </button>
        </form>
      </nav>
    </>
  );
}
