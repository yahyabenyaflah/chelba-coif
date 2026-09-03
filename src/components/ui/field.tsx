import { type InputHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";

import { cn } from "@/lib/utils";

const controlClass =
  "min-h-11 w-full rounded-sm border border-stone/30 bg-charcoal-raised px-3.5 py-2.5 text-ivory placeholder:text-stone/60 transition-colors focus:border-brass focus:outline-none disabled:opacity-50";

type FieldWrapperProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (inputProps: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
};

/**
 * Assemble label visible, aide persistante et erreur dans un seul `aria-describedby` :
 * un lecteur d'écran doit entendre les deux, pas seulement l'un ou l'autre.
 */
function FieldWrapper({ label, hint, error, required, children }: FieldWrapperProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ivory">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": !!error })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-stone">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, className, required, ...props }: TextFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required}>
      {(inputProps) => (
        <input
          {...inputProps}
          {...props}
          required={required}
          className={cn(controlClass, error && "border-danger", className)}
        />
      )}
    </FieldWrapper>
  );
}

export type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextAreaField({ label, hint, error, className, required, ...props }: TextAreaFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required}>
      {(inputProps) => (
        <textarea
          {...inputProps}
          {...props}
          required={required}
          className={cn(controlClass, "min-h-24 resize-y", error && "border-danger", className)}
        />
      )}
    </FieldWrapper>
  );
}

export type SelectFieldProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function SelectField({ label, hint, error, className, required, children, ...props }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required}>
      {(inputProps) => (
        <select
          {...inputProps}
          {...props}
          required={required}
          className={cn(controlClass, "cursor-pointer", error && "border-danger", className)}
        >
          {children}
        </select>
      )}
    </FieldWrapper>
  );
}
