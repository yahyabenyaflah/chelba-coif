"use client";

import { useRef } from "react";

import { gsap, prefersReducedMotion } from "@/lib/motion/gsap";
import { cn } from "@/lib/utils";

/**
 * Inclinaison 3D au survol, pilotée par la position du curseur — l'un des
 * signes les plus reconnaissables d'une interface travaillée (Stripe, Apple)
 * plutôt que d'un gabarit générique. Seul `transform` est animé : le GPU
 * compose la carte sur son propre calque, sans repaint ni impact sur le
 * layout des éléments voisins.
 *
 * `gsap.quickTo` plutôt que `gsap.to` en boucle : une seule interpolation
 * réutilisée à chaque `mousemove`, sans recréer de tween à chaque frame.
 */
export function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: React.ReactNode;
  className?: string;
  /** Angle maximal, en degrés. */
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const quickRef = useRef<{
    x: (v: number) => void;
    y: (v: number) => void;
    scale: (v: number) => void;
  } | null>(null);

  function ensureQuick() {
    if (quickRef.current || !ref.current) return quickRef.current;
    quickRef.current = {
      x: gsap.quickTo(ref.current, "rotateX", { duration: 0.4, ease: "power3.out" }),
      y: gsap.quickTo(ref.current, "rotateY", { duration: 0.4, ease: "power3.out" }),
      scale: gsap.quickTo(ref.current, "scale", { duration: 0.4, ease: "power3.out" }),
    };
    return quickRef.current;
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    const quick = ensureQuick();
    if (!el || !quick) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    quick.x(-py * max * 2);
    quick.y(px * max * 2);
    quick.scale(1.02);
  }

  function handleLeave() {
    const quick = ensureQuick();
    if (!quick) return;
    quick.x(0);
    quick.y(0);
    quick.scale(1);
  }

  return (
    <div className="tilt-perspective">
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className={cn("will-change-transform", className)}
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </div>
  );
}
