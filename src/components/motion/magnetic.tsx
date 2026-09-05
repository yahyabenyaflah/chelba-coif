"use client";

import { useRef } from "react";

import { gsap, prefersReducedMotion } from "@/lib/motion/gsap";

/**
 * Attire légèrement son contenu vers le curseur au survol (effet
 * « magnétique »). Réservé à 1-2 éléments par écran maximum — l'appât
 * visuel perd tout son sens si chaque bouton bouge, il ne doit signaler que
 * l'action principale (ici, le CTA de réservation).
 */
export function Magnetic({ children, strength = 0.35 }: { children: React.ReactElement; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const quickRef = useRef<{ x: (v: number) => void; y: (v: number) => void } | null>(null);

  function ensureQuick() {
    if (quickRef.current || !ref.current) return quickRef.current;
    quickRef.current = {
      x: gsap.quickTo(ref.current, "x", { duration: 0.5, ease: "elastic.out(1, 0.4)" }),
      y: gsap.quickTo(ref.current, "y", { duration: 0.5, ease: "elastic.out(1, 0.4)" }),
    };
    return quickRef.current;
  }

  function handleMove(e: React.MouseEvent<HTMLSpanElement>) {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    const quick = ensureQuick();
    if (!el || !quick) return;
    const rect = el.getBoundingClientRect();
    quick.x((e.clientX - rect.left - rect.width / 2) * strength);
    quick.y((e.clientY - rect.top - rect.height / 2) * strength);
  }

  function handleLeave() {
    const quick = ensureQuick();
    quick?.x(0);
    quick?.y(0);
  }

  return (
    <span
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="inline-block will-change-transform"
    >
      {children}
    </span>
  );
}
