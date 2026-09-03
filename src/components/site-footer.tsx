import Link from "next/link";
import { Phone } from "lucide-react";

import { getSettings } from "@/lib/data";
import { formatPhone } from "@/lib/utils";
import { Logo } from "@/components/logo";

export async function SiteFooter() {
  const settings = await getSettings();

  return (
    <footer className="border-t border-brass-soft/30 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-stone">
          <span>{settings.address}</span>
          <a
            href={`tel:${settings.phone}`}
            className="flex items-center gap-1.5 transition-colors hover:text-brass"
          >
            <Phone size={14} aria-hidden="true" />
            {formatPhone(settings.phone)}
          </a>
          <Link href="/admin/connexion" className="transition-colors hover:text-ivory">
            Espace coiffeur
          </Link>
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-xs text-stone/70">
        © {new Date().getFullYear()} {settings.salonName} — Djerba
      </p>
    </footer>
  );
}
