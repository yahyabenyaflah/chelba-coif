"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Enregistrement du plugin, fait une seule fois par bundle client. Ce module
 * n'est importé que par des composants client (jamais depuis une page
 * serveur), donc `window` existe toujours à l'exécution — mais on protège
 * quand même contre un double enregistrement en environnement de test/SSR.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Respecté par chaque animation de ce dossier : quand l'utilisateur a
 * demandé moins de mouvement au niveau système, les scroll-reveals /
 * parallax / tilt se désactivent au profit d'un simple affichage, sans
 * qu'aucun composant n'ait à re-vérifier la préférence lui-même.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger };
