"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/ui/feedback";
import { IconCheck } from "@/components/ui/icons";
import { aDolares } from "@/domain/money";
import { cn } from "@/lib/utils";
import { guardarCategoria, guardarZona, type EstadoForm } from "@/server/actions/admin-catalogo";

const INICIAL: EstadoForm = { ok: false, mensaje: null, errores: {} };
const celda =
  "h-9 w-full rounded-lg border-0 bg-white px-2.5 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none aria-[invalid=true]:ring-danger-600";

function Estado({ estado, pendiente }: { estado: EstadoForm; pendiente: boolean }) {
  if (pendiente) return <Spinner className="text-brand-700 size-4" />;
  if (!estado.mensaje) return null;
  const errores = Object.values(estado.errores);
  return (
    <span
      role="status"
      className={cn("text-xs", estado.ok ? "text-green-700" : "text-danger-600")}
      title={errores.join(" · ")}
    >
      {estado.ok ? <IconCheck size={14} className="inline" /> : null}{" "}
      {estado.ok ? estado.mensaje : (errores[0] ?? estado.mensaje)}
    </span>
  );
}

export function FilaCategoria({
  categoria,
}: {
  categoria?: { id: string; nombre: string; slug: string; icono: string | null; orden: number };
}) {
  const [estado, accion, pendiente] = useActionState(guardarCategoria, INICIAL);
  const e = estado.errores;
  return (
    <form action={accion} className="grid grid-cols-[2fr_2fr_1fr_80px_auto] items-center gap-2">
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      <input
        name="nombre"
        aria-label="Nombre"
        defaultValue={categoria?.nombre}
        placeholder="Nombre"
        className={celda}
        aria-invalid={!!e.nombre}
        required
      />
      <input
        name="slug"
        aria-label="Slug"
        defaultValue={categoria?.slug}
        placeholder="slug"
        className={celda}
        aria-invalid={!!e.slug}
        required
      />
      <select
        name="icono"
        aria-label="Icono"
        defaultValue={categoria?.icono ?? ""}
        className={celda}
      >
        <option value="">—</option>
        {["gift", "drumstick", "wheat", "spray", "cup", "candy"].map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
      <input
        name="orden"
        aria-label="Orden"
        type="number"
        defaultValue={categoria?.orden ?? 10}
        className={celda}
      />
      <div className="flex min-w-28 items-center gap-2">
        <button
          type="submit"
          className="bg-brand-700 h-9 rounded-lg px-3 text-xs font-semibold text-white"
        >
          {categoria ? "Guardar" : "Añadir"}
        </button>
        <Estado estado={estado} pendiente={pendiente} />
      </div>
    </form>
  );
}

export function FilaZona({
  zona,
}: {
  zona?: {
    id: string;
    municipio: string;
    costoCentavos: number;
    diasMin: number;
    diasMax: number;
    activa: boolean;
  };
}) {
  const [estado, accion, pendiente] = useActionState(guardarZona, INICIAL);
  const e = estado.errores;
  return (
    <form
      action={accion}
      className="grid grid-cols-[2fr_1fr_70px_70px_auto_auto] items-center gap-2"
    >
      {zona && <input type="hidden" name="id" value={zona.id} />}
      <input
        name="municipio"
        aria-label="Municipio"
        defaultValue={zona?.municipio}
        placeholder="Municipio"
        className={celda}
        aria-invalid={!!e.municipio}
        required
      />
      <input
        name="costo_usd"
        aria-label="Costo de envío (USD)"
        type="number"
        step="0.01"
        min="0"
        defaultValue={zona ? aDolares(zona.costoCentavos).toFixed(2) : ""}
        placeholder="USD"
        className={celda}
        aria-invalid={!!e.costo_usd}
        required
      />
      <input
        name="dias_min"
        aria-label="Días mínimos"
        type="number"
        min="0"
        defaultValue={zona?.diasMin ?? 1}
        className={celda}
        aria-invalid={!!e.dias_min}
      />
      <input
        name="dias_max"
        aria-label="Días máximos"
        type="number"
        min="0"
        defaultValue={zona?.diasMax ?? 3}
        className={celda}
        aria-invalid={!!e.dias_max}
      />
      <label className="flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          name="activa"
          defaultChecked={zona?.activa ?? true}
          className="accent-brand-700 size-4"
        />
        Activa
      </label>
      <div className="flex min-w-28 items-center gap-2">
        <button
          type="submit"
          className="bg-brand-700 h-9 rounded-lg px-3 text-xs font-semibold text-white"
        >
          {zona ? "Guardar" : "Añadir"}
        </button>
        <Estado estado={estado} pendiente={pendiente} />
      </div>
    </form>
  );
}
