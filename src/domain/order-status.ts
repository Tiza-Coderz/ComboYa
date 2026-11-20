export const ESTADOS_PEDIDO = [
  "pendiente",
  "confirmado",
  "en_preparacion",
  "en_camino",
  "entregado",
  "cancelado",
] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const ESTADOS_PAGO = ["pendiente", "pagado", "reembolsado"] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const METODOS_PAGO = ["enlace_pago", "efectivo_entrega"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  en_preparacion: "En preparación",
  en_camino: "En camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ETIQUETA_PAGO: Record<EstadoPago, string> = {
  pendiente: "Pago pendiente",
  pagado: "Pagado",
  reembolsado: "Reembolsado",
};

export const ETIQUETA_METODO: Record<MetodoPago, string> = {
  enlace_pago: "Pago con enlace (TropiPay / Zelle)",
  efectivo_entrega: "Efectivo al entregar (USD)",
};

/** Flujo normal; se puede cancelar hasta que el pedido se entrega. */
const TRANSICIONES: Record<EstadoPedido, readonly EstadoPedido[]> = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["en_preparacion", "cancelado"],
  en_preparacion: ["en_camino", "cancelado"],
  en_camino: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};

const TRANSICIONES_PAGO: Record<EstadoPago, readonly EstadoPago[]> = {
  pendiente: ["pagado"],
  pagado: ["pendiente", "reembolsado"],
  reembolsado: [],
};

export function siguientesEstados(actual: EstadoPedido): readonly EstadoPedido[] {
  return TRANSICIONES[actual];
}

export function puedeCambiarEstado(desde: EstadoPedido, hacia: EstadoPedido): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function puedeCambiarPago(desde: EstadoPago, hacia: EstadoPago): boolean {
  return TRANSICIONES_PAGO[desde].includes(hacia);
}

export function esEstadoFinal(estado: EstadoPedido): boolean {
  return TRANSICIONES[estado].length === 0;
}

/** Pasos que se muestran en la línea de tiempo del seguimiento. */
export const PASOS_SEGUIMIENTO: readonly EstadoPedido[] = [
  "pendiente",
  "confirmado",
  "en_preparacion",
  "en_camino",
  "entregado",
];

/** Índice del paso alcanzado (−1 si el pedido está cancelado). */
export function pasoActual(estado: EstadoPedido): number {
  return PASOS_SEGUIMIENTO.indexOf(estado);
}

export function esEstadoPedido(v: string): v is EstadoPedido {
  return (ESTADOS_PEDIDO as readonly string[]).includes(v);
}

export function esEstadoPago(v: string): v is EstadoPago {
  return (ESTADOS_PAGO as readonly string[]).includes(v);
}
