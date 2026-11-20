/**
 * Dinero. Todo importe se maneja en CENTAVOS (enteros) para evitar errores de
 * coma flotante. La base de datos guarda dólares con 2 decimales (numeric).
 */
export type Moneda = "USD" | "EUR" | "CUP";

export const MONEDAS: readonly Moneda[] = ["USD", "EUR", "CUP"];

/** Tasas vigentes: 1 USD = `tasa` unidades de la moneda. */
export type Tasas = Partial<Record<Exclude<Moneda, "USD">, number>>;

/** Convierte un importe en dólares (número o texto de la BD) a centavos enteros. */
export function aCentavos(valor: number | string): number {
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) throw new RangeError(`Importe no válido: ${String(valor)}`);
  // toPrecision corrige casos como 1.005 * 100 = 100.49999…
  return Math.round(Number((n * 100).toPrecision(12)));
}

/** Centavos → dólares con 2 decimales (para enviar a la BD). */
export function aDolares(centavos: number): number {
  return Math.round(centavos) / 100;
}

/**
 * Convierte centavos de USD a centavos de otra moneda con la tasa dada.
 * Devuelve null si no hay tasa para esa moneda.
 */
export function convertir(centavosUsd: number, moneda: Moneda, tasas: Tasas): number | null {
  if (moneda === "USD") return centavosUsd;
  const tasa = tasas[moneda];
  if (tasa === undefined || !(tasa > 0)) return null;
  return Math.round(centavosUsd * tasa);
}

function agruparMiles(entero: string, separador: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, separador);
}

/**
 * Formato determinista (igual en servidor y navegador, sin depender de ICU):
 *   USD → "$1,250.50" · EUR → "€1,150.46" · CUP → "512 500 CUP" (sin centavos).
 */
export function formatearMoneda(centavos: number, moneda: Moneda): string {
  const abs = Math.abs(Math.round(centavos));
  const signo = centavos < 0 ? "-" : "";

  if (moneda === "CUP") {
    const pesos = Math.round(abs / 100).toString();
    return `${signo}${agruparMiles(pesos, " ")} CUP`;
  }

  const entero = Math.floor(abs / 100).toString();
  const dec = (abs % 100).toString().padStart(2, "0");
  const simbolo = moneda === "USD" ? "$" : "€";
  return `${signo}${simbolo}${agruparMiles(entero, ",")}.${dec}`;
}
