import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconAlert, IconCheck } from "./icons";

export function Badge({
  children,
  tono = "neutro",
  className,
}: {
  children: ReactNode;
  tono?: "neutro" | "marca" | "exito" | "aviso" | "peligro" | "info";
  className?: string;
}) {
  const tonos = {
    neutro: "bg-slate-100 text-slate-700",
    marca: "bg-brand-100 text-brand-800",
    exito: "bg-green-100 text-green-800",
    aviso: "bg-amber-100 text-amber-800",
    peligro: "bg-red-100 text-red-800",
    info: "bg-sky-100 text-sky-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tonos[tono],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Alert({
  tono = "info",
  titulo,
  children,
  className,
}: {
  tono?: "info" | "exito" | "aviso" | "peligro";
  titulo?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tonos = {
    info: "bg-brand-50 text-brand-900 ring-brand-200",
    exito: "bg-green-50 text-green-900 ring-green-200",
    aviso: "bg-amber-50 text-amber-900 ring-amber-200",
    peligro: "bg-red-50 text-red-900 ring-red-200",
  };
  return (
    <div
      role={tono === "peligro" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl p-4 text-sm ring-1", tonos[tono], className)}
    >
      {tono === "exito" ? (
        <IconCheck className="mt-0.5 shrink-0" />
      ) : (
        <IconAlert className="mt-0.5 shrink-0" />
      )}
      <div className="space-y-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icono,
  titulo,
  children,
  accion,
}: {
  icono?: ReactNode;
  titulo: string;
  children?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-slate-200">
      {icono && (
        <div className="bg-brand-50 text-brand-700 grid size-14 place-items-center rounded-full">
          {icono}
        </div>
      )}
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
      {children && <div className="max-w-sm text-sm text-slate-600">{children}</div>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/80", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-5 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
