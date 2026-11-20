"use client";

import { useEffect } from "react";

/** Abre el diálogo de impresión al cargar y ofrece un botón por si se cierra. */
export function BotonImprimir() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-brand-700 rounded-lg px-4 py-2 text-sm font-semibold text-white print:hidden"
    >
      Imprimir
    </button>
  );
}
