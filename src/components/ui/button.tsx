import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-brass text-charcoal hover:bg-brass-soft disabled:hover:bg-brass",
  outline:
    "border border-stone/40 text-ivory hover:border-brass hover:text-brass disabled:hover:border-stone/40 disabled:hover:text-ivory",
  ghost: "text-stone hover:text-ivory disabled:hover:text-stone",
  danger: "bg-danger text-charcoal hover:brightness-110",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

/**
 * `cursor-pointer` explicite : Tailwind ne le met pas par défaut sur
 * `<button>`, contrairement à ce qu'on pourrait attendre.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
