import { convertir, type Moneda, type Tasas } from "./money";

export interface LineaPrecio {
  precioCentavos: number;
  cantidad: number;
}

export interface Totales {
  subtotal: number;
  envio: number;
  total: number;
}

export function calcularSubtotal(lineas: readonly LineaPrecio[]): number {
  return lineas.reduce((acc, l) => {
    if (!Number.isInteger(l.cantidad) || l.cantidad < 0) {
      throw new RangeError(`Cantidad no válida: ${l.cantidad}`);
    }
    return acc + l.precioCentavos * l.cantidad;
  }, 0);
}

/** Totales del pedido en centavos de USD. Con el carrito vacío no se cobra envío. */
export function calcularTotales(lineas: readonly LineaPrecio[], envioCentavos = 0): Totales {
  const subtotal = calcularSubtotal(lineas);
  const envio = subtotal > 0 ? envioCentavos : 0;
  return { subtotal, envio, total: subtotal + envio };
}

/** Cuánto ahorra el cliente al comprar el combo frente a los productos por separado. */
export function ahorroCombo(precioComboCentavos: number, items: readonly LineaPrecio[]) {
  const valorSeparado = calcularSubtotal(items);
  const ahorro = Math.max(0, valorSeparado - precioComboCentavos);
  const porcentaje = valorSeparado > 0 ? Math.round((ahorro / valorSeparado) * 100) : 0;
  return { valorSeparado, ahorro, porcentaje };
}

/** Totales expresados en otra moneda (null si no hay tasa). */
export function totalesEn(totales: Totales, moneda: Moneda, tasas: Tasas): Totales | null {
  const subtotal = convertir(totales.subtotal, moneda, tasas);
  const envio = convertir(totales.envio, moneda, tasas);
  const total = convertir(totales.total, moneda, tasas);
  if (subtotal === null || envio === null || total === null) return null;
  return { subtotal, envio, total };
}
