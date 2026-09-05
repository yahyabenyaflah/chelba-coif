"use client";

import { useLayoutEffect, useRef } from "react";

import { gsap, prefersReducedMotion } from "@/lib/motion/gsap";
import { cn } from "@/lib/utils";

/**
 * Fait apparaître les enfants directs en cascade au passage à l'écran
 * (scroll-reveal). Remplace `.rise-in` (CSS pur, se déclenche au montage
 * quel que soit le défilement) pour tout ce qui vit plus bas dans la page :
 * une animation qui se joue hors champ ne sert à rien et coûte un repaint
 * inutile au chargement.
 */
export function Reveal({
  children,
  className,
  y = 28,
  stagger = 0.08,
  start = "top 85%",
}: {
  children: React.ReactNode;
  className?: string;
  /** Décalage vertical de départ, en pixels. */
  y?: number;
  /** Délai entre chaque enfant, en secondes. */
  stagger?: number;
  /** Seuil ScrollTrigger — voir la doc GSAP pour la syntaxe. */
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const targets = Array.from(el.children);
    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y,
        duration: 0.6,
        stagger,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start, once: true },
      });
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- les props de réglage ne doivent pas relancer l'effet
  }, []);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
