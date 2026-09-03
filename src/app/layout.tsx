import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import "./globals.css";

/**
 * Polices auto-hébergées via next/font : aucune requête vers Google au
 * chargement, pas de décalage de mise en page (voir globals.css pour le
 * raccordement aux tokens --font-display / --font-body).
 */
const heading = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading-src",
  display: "swap",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-src",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://chelba-coif.tn"),
  title: {
    default: "Chelba Coif — Barbershop à Djerba",
    template: "%s — Chelba Coif",
  },
  description:
    "Chelba Coif, barbershop moderne à Djerba. Réservez en ligne : coupes, dégradés, taille de barbe et soins pour homme.",
  openGraph: {
    title: "Chelba Coif — Barbershop à Djerba",
    description:
      "Réservez votre coupe en ligne. Coupes, dégradés, taille de barbe et soins pour homme, à Djerba.",
    locale: "fr_FR",
    type: "website",
  },
};

/**
 * Rendu dynamique forcé pour toute l'application : chaque page touche la
 * base (disponibilités, réglages, galerie, sessions) et rien ici ne
 * bénéficierait d'un rendu statique figé au build. Évite aussi qu'une page
 * échoue à la génération statique faute de secrets disponibles au moment du
 * build (voir src/lib/env.ts) — la validation n'a lieu qu'à la requête.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#17150f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`h-full antialiased ${heading.variable} ${body.variable}`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-brass focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-charcoal"
        >
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
