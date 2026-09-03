import Link from "next/link";
import { User } from "lucide-react";

import { getCustomer } from "@/lib/auth/dal";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";

const NAV_LINKS = [
  { href: "/coupes", label: "Coupes" },
  { href: "/reserver", label: "Réserver" },
  { href: "/ma-reservation", label: "Suivre un rendez-vous" },
] as const;

export async function SiteHeader() {
  const customer = await getCustomer();

  return (
    <header className="sticky top-0 z-20 border-b border-brass-soft/40 bg-charcoal/95 backdrop-blur relative">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden gap-8 text-sm text-stone md:flex" aria-label="Navigation principale">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-ivory">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={customer ? "/compte" : "/compte/connexion"}
            className="inline-flex items-center gap-2 rounded-sm border border-stone/40 px-4 py-2 text-sm font-medium text-ivory transition-colors hover:border-brass hover:text-brass"
          >
            <User size={15} aria-hidden="true" />
            {customer ? customer.fullName.split(" ")[0] : "Mon compte"}
          </Link>
          <Link
            href="/reserver"
            className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-charcoal transition-all hover:scale-[1.02] hover:bg-brass-soft"
          >
            Réserver
          </Link>
        </div>

        <MobileNav links={NAV_LINKS} isLoggedIn={!!customer} />
      </div>
    </header>
  );
}
