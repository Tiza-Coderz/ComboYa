"use client";

import { createContext, use, useCallback, useSyncExternalStore, type ReactNode } from "react";
import { convertir, formatearMoneda, type Tasas } from "@/domain/money";
import { cn } from "@/lib/utils";

/** Moneda principal elegida por el cliente. El CUP se muestra siempre como referencia. */
export type MonedaVisible = "USD" | "EUR";

const CLAVE = "comboya:moneda";
const oyentes = new Set<() => void>();

function leer(): MonedaVisible {
  try {
    return localStorage.getItem(CLAVE) === "EUR" ? "EUR" : "USD";
  } catch {
    return "USD";
  }
}

function suscribir(cb: () => void) {
  oyentes.add(cb);
  const alCambiar = (e: StorageEvent) => e.key === CLAVE && cb();
  window.addEventListener("storage", alCambiar);
  return () => {
    oyentes.delete(cb);
    window.removeEventListener("storage", alCambiar);
  };
}

const Contexto = createContext<{ tasas: Tasas }>({ tasas: {} });

export function MonedaProvider({ tasas, children }: { tasas: Tasas; children: ReactNode }) {
  return <Contexto value={{ tasas }}>{children}</Contexto>;
}

export function useMoneda() {
  const { tasas } = use(Contexto);
  const moneda = useSyncExternalStore(suscribir, leer, () => "USD" as const);
  const cambiar = useCallback((m: MonedaVisible) => {
    try {
      localStorage.setItem(CLAVE, m);
    } catch {
      /* modo privado: solo para esta vista */
    }
    oyentes.forEach((cb) => cb());
  }, []);
  // Sin tasa de EUR cargada, se muestra USD.
  const efectiva: MonedaVisible = moneda === "EUR" && tasas.EUR ? "EUR" : "USD";
  return { moneda: efectiva, cambiar, tasas };
}

/** Precio en la moneda elegida y, debajo, el equivalente aproximado en CUP. */
export function Precio({
  centavos,
  conCup = true,
  className,
  tamano = "md",
}: {
  centavos: number;
  conCup?: boolean;
  className?: string;
  tamano?: "sm" | "md" | "lg" | "xl";
}) {
  const { moneda, tasas } = useMoneda();
  const principal = convertir(centavos, moneda, tasas) ?? centavos;
  const cup = conCup ? convertir(centavos, "CUP", tasas) : null;
  const tamanos = { sm: "text-sm", md: "text-lg", lg: "text-2xl", xl: "text-3xl" };
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className={cn("font-bold text-slate-900 tabular-nums", tamanos[tamano])}>
        {formatearMoneda(principal, moneda)}
      </span>
      {cup !== null && (
        <span className="text-xs text-slate-500 tabular-nums">≈ {formatearMoneda(cup, "CUP")}</span>
      )}
    </span>
  );
}

export function SelectorMoneda({ className }: { className?: string }) {
  const { moneda, cambiar, tasas } = useMoneda();
  if (!tasas.EUR) return null;
  return (
    <div
      role="group"
      aria-label="Moneda de los precios"
      className={cn("inline-flex rounded-lg bg-white/10 p-0.5 text-xs font-semibold", className)}
    >
      {(["USD", "EUR"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={moneda === m}
          onClick={() => cambiar(m)}
          className={cn(
            "rounded-md px-2 py-1 transition-colors",
            moneda === m ? "text-brand-800 bg-white" : "text-white/90 hover:bg-white/10",
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
