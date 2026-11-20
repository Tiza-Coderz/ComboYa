"use client";

import Link from "next/link";
import { useState } from "react";
import { clasesBoton } from "@/components/ui/button";
import { IconCart, IconCheck, IconMinus, IconPlus } from "@/components/ui/icons";
import { MAX_CANTIDAD, type ProductoCarrito } from "@/domain/cart";
import { cn } from "@/lib/utils";
import { useAviso, useCarrito } from "./carrito-store";

function Contador({ n, className }: { n: number; className?: string }) {
  if (n === 0) return null;
  return (
    <span
      className={cn(
        "absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] leading-5 font-bold text-amber-950",
        className,
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Botón del carrito en la cabecera. */
export function EnlaceCarrito() {
  const { unidades } = useCarrito();
  return (
    <Link
      href="/carrito"
      aria-label={`Carrito, ${unidades} ${unidades === 1 ? "unidad" : "unidades"}`}
      className="relative grid size-10 place-items-center rounded-xl hover:bg-white/10"
    >
      <IconCart size={22} />
      <Contador n={unidades} />
    </Link>
  );
}

/** Botón del carrito en la barra inferior (móvil). */
export function EnlaceCarritoInferior() {
  const { unidades } = useCarrito();
  return (
    <Link
      href="/carrito"
      className="text-brand-700 flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold"
    >
      <span className="relative">
        <IconCart />
        <Contador n={unidades} />
      </span>
      Carrito
    </Link>
  );
}

/** Botón compacto "+" para las tarjetas de producto. */
export function BotonAgregarRapido({ producto }: { producto: ProductoCarrito }) {
  const { agregar } = useCarrito();
  return (
    <button
      type="button"
      onClick={() => agregar(producto)}
      aria-label={`Agregar ${producto.nombre} al carrito`}
      className="bg-brand-700 hover:bg-brand-800 grid size-10 place-items-center rounded-xl text-white shadow-sm"
    >
      <IconPlus />
    </button>
  );
}

export function SelectorCantidad({
  valor,
  onCambiar,
  etiqueta,
  tamano = "md",
}: {
  valor: number;
  onCambiar: (n: number) => void;
  etiqueta: string;
  tamano?: "sm" | "md";
}) {
  const alto = tamano === "sm" ? "h-9" : "h-12";
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn("inline-flex items-center rounded-xl bg-white ring-1 ring-slate-300", alto)}
    >
      <button
        type="button"
        onClick={() => onCambiar(valor - 1)}
        aria-label="Quitar uno"
        className="grid h-full w-10 place-items-center text-slate-700 hover:text-slate-900"
      >
        <IconMinus size={18} />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        onClick={() => onCambiar(valor + 1)}
        disabled={valor >= MAX_CANTIDAD}
        aria-label="Agregar uno"
        className="grid h-full w-10 place-items-center text-slate-700 hover:text-slate-900 disabled:opacity-40"
      >
        <IconPlus size={18} />
      </button>
    </div>
  );
}

/** Cantidad + "Agregar al carrito" para la ficha de producto. */
export function AgregarAlCarrito({
  producto,
  maximo,
}: {
  producto: ProductoCarrito;
  maximo?: number;
}) {
  const { agregar, items } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const tope = Math.min(MAX_CANTIDAD, maximo ?? MAX_CANTIDAD);
  const enCarrito = items.find((i) => i.productoId === producto.productoId)?.cantidad ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <SelectorCantidad
          valor={cantidad}
          onCambiar={(n) => setCantidad(Math.max(1, Math.min(tope, n)))}
          etiqueta="Cantidad"
        />
        <button
          type="button"
          onClick={() => {
            agregar(producto, cantidad);
            setCantidad(1);
          }}
          className={clasesBoton("primario", "lg", "flex-1 sm:flex-none")}
        >
          <IconCart /> Agregar al carrito
        </button>
      </div>
      {enCarrito > 0 && (
        <p className="flex items-center gap-1.5 text-sm text-green-700">
          <IconCheck size={16} /> Tiene {enCarrito} en el carrito ·{" "}
          <Link href="/carrito" className="font-semibold underline">
            Ver carrito
          </Link>
        </p>
      )}
    </div>
  );
}

/** Región de avisos (aria-live) para confirmar acciones sin bloquear al usuario. */
export function Avisos() {
  const aviso = useAviso();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6"
    >
      {aviso && (
        <div
          key={aviso.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
        >
          <IconCheck size={18} className="text-green-400" />
          <span>{aviso.texto}</span>
          <Link href="/carrito" className="font-semibold text-amber-300 underline">
            Ver carrito
          </Link>
        </div>
      )}
    </div>
  );
}
