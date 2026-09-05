import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Playfair_Display, Space_Grotesk } from "next/font/google";

import "./globals.css";

/**
 * Polices auto-hébergées via next/font : aucune requête vers Google au
 * chargement, pas de décalage de mise en page (voir globals.css pour le
 * raccordement aux tokens --font-display / --font-body / --font-accent).
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

/**
 * Accent éditorial en serif italique — citations, chiffres clés. Un contraste
 * de voix (sans-serif net + serif manuscrite) est ce qui distingue une
 * identité pensée d'un gabarit générique.
 */
const accent = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["italic"],
  variable: "--font-accent-src",
  display: "swap",
});

export const metadata: Metadata = {
  // `process.env` lu directement (pas via `env()`) : cet objet est évalué au
  // chargement du module, avant toute requête — passer par la validation
  // stricte d'`env()` ici romprait le build tant que SITE_URL n'est pas
  // renseignée. Une URL de secours est toujours disponible, sans conséquence
  // de sécurité puisque ce n'est pas un secret.
  metadataBase: new URL(process.env.SITE_URL || "https://chelba-coif.tn"),
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
    <html
      lang="fr"
      // Requis par Next.js 16 dès que `scroll-behavior: smooth` est défini en
      // CSS (voir globals.css) : signale explicitement au routeur de ne pas
      // interférer avec la restauration de défilement entre les pages.
      data-scroll-behavior="smooth"
      className={`h-full antialiased ${heading.variable} ${body.variable} ${accent.variable}`}
    >
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
