import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Encabezado({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-slate-600">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

export function Tarjeta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200", className)}>
      {children}
    </div>
  );
}

/** Contenedor de tabla con scroll horizontal en móvil. */
export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="w-full min-w-[640px] text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-slate-500 [&_th]:uppercase [&_thead]:bg-slate-50 [&_tr]:border-b [&_tr]:border-slate-100 [&_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

export function StatCard({
  titulo,
  valor,
  detalle,
  icono,
}: {
  titulo: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icono?: ReactNode;
}) {
  return (
    <Tarjeta className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{titulo}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{valor}</p>
        {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
      </div>
      {icono && (
        <span className="bg-brand-50 text-brand-700 grid size-10 shrink-0 place-items-center rounded-xl">
          {icono}
        </span>
      )}
    </Tarjeta>
  );
}
