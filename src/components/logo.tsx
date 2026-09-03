import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Logo fourni par le client (public/assets/logo.jpeg), retravaillé en PNG à
 * fond transparent pour se fondre dans le thème charbon plutôt que d'afficher
 * un carré noir. Deux recadrages sont dérivés du même fichier source :
 * - `logo-mark.png` : le monogramme seul.
 * - `logo.png` : le monogramme + la signature « CHELBA coiff » complète.
 *
 * Le monogramme seul est utilisé dans les espaces compacts (nav, pied de
 * page) car la signature texte, une fois réduite à la hauteur d'une barre de
 * navigation, devient illisible — le pairer avec un texte HTML net résout ça
 * sans perdre le monogramme dessiné. Le lockup complet reste réservé aux
 * contextes plus larges (écran de connexion, page d'accueil).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/logo-mark.png"
      alt="Chelba Coif"
      width={209}
      height={168}
      priority
      className={cn("sign-glow h-9 w-auto object-contain", className)}
    />
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn("h-9", markClassName)} />
      <span className="font-display text-lg font-semibold tracking-tight text-ivory">
        Chelba Coif
      </span>
    </span>
  );
}

/** Lockup complet (monogramme + signature), pour les contextes spacieux. */
export function LogoFull({ className }: { className?: string }) {
  return (
    <Image
      src="/assets/logo.png"
      alt="Chelba Coif"
      width={246}
      height={261}
      priority
      className={cn("sign-glow h-24 w-auto object-contain", className)}
    />
  );
}
