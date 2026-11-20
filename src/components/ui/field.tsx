import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const clasesInput =
  "block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none aria-[invalid=true]:ring-danger-600 disabled:bg-slate-100";

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  ayuda?: ReactNode;
  opcional?: boolean;
  children: ReactNode;
  className?: string;
}

/** Etiqueta + control + ayuda + error, enlazados con aria-describedby. */
export function Field({ id, label, error, ayuda, opcional, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
        {opcional && <span className="ml-1 font-normal text-slate-500">(opcional)</span>}
      </label>
      {children}
      {ayuda && !error && (
        <p id={`${id}-ayuda`} className="text-xs text-slate-500">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-danger-600 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/** Props de accesibilidad para el control de un Field. */
export function ariaCampo(id: string, error?: string, ayuda?: boolean) {
  return {
    id,
    name: id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined,
  } as const;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(clasesInput, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(clasesInput, "min-h-24", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(clasesInput, "pr-9", className)} {...props} />;
}

export function Checkbox({
  label,
  className,
  ...props
}: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm", className)}>
      <input
        type="checkbox"
        className="accent-brand-700 size-4 rounded border-slate-300"
        {...props}
      />
      {label}
    </label>
  );
}
