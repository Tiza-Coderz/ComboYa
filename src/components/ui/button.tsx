import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variante = "primario" | "secundario" | "fantasma" | "peligro" | "whatsapp";
type Tamano = "sm" | "md" | "lg";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm",
  secundario: "bg-white text-brand-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50",
  fantasma: "text-brand-700 hover:bg-brand-50",
  peligro: "bg-danger-600 text-white hover:bg-red-700",
  whatsapp: "bg-[#1fa855] text-white hover:bg-[#178a45] shadow-sm",
};

const TAMANOS: Record<Tamano, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-[15px] gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function clasesBoton(
  variante: Variante = "primario",
  tamano: Tamano = "md",
  extra?: string,
) {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60",
    VARIANTES[variante],
    TAMANOS[tamano],
    extra,
  );
}

interface Comunes {
  variante?: Variante;
  tamano?: Tamano;
  children: ReactNode;
}

export function Button({
  variante,
  tamano,
  className,
  type = "button",
  ...props
}: Comunes & ComponentProps<"button">) {
  return <button type={type} className={clasesBoton(variante, tamano, className)} {...props} />;
}

export function ButtonLink({
  variante,
  tamano,
  className,
  ...props
}: Comunes & ComponentProps<typeof Link>) {
  return <Link className={clasesBoton(variante, tamano, className)} {...props} />;
}

/** Enlace externo (wa.me, etc.) con estilo de botón. */
export function ButtonA({ variante, tamano, className, ...props }: Comunes & ComponentProps<"a">) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={clasesBoton(variante, tamano, className)}
      {...props}
    />
  );
}
