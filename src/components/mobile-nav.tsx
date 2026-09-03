"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, User, X } from "lucide-react";

export function MobileNav({
  links,
  isLoggedIn,
}: {
  links: readonly { href: string; label: string }[];
  isLoggedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-ivory transition-colors hover:text-brass"
      >
        {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full border-b border-brass-soft/40 bg-charcoal px-6 py-4"
        >
          <nav className="flex flex-col gap-1" aria-label="Navigation mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-sm px-3 py-3 text-base text-ivory transition-colors hover:bg-charcoal-raised"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={isLoggedIn ? "/compte" : "/compte/connexion"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-sm px-3 py-3 text-base text-ivory transition-colors hover:bg-charcoal-raised"
            >
              <User size={16} aria-hidden="true" />
              Mon compte
            </Link>
            <Link
              href="/reserver"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-sm bg-brass px-3 py-3 text-center text-base font-medium text-charcoal"
            >
              Réserver
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
