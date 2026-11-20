import type { EstadoPago, EstadoPedido } from "./order-status";

export const ZONA_HORARIA = "America/Havana";

export interface PedidoDashboard {
  creadoEn: string;
  totalCentavos: number;
  estado: EstadoPedido;
  estadoPago: EstadoPago;
  municipio: string;
  items: readonly { productoId: string | null; nombre: string; cantidad: number; precioCentavos: number }[];
}

export interface ResumenDashboard {
  ventas: number;
  pedidos: number;
  ticketMedio: number;
  pendientes: number;
  porCobrar: number;
  ventasPorDia: { fecha: string; total: number; pedidos: number }[];
  topProductos: { nombre: string; unidades: number; ingresos: number }[];
  porMunicipio: { municipio: string; pedidos: number; total: number }[];
}

const formatoFecha = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha local de La Habana en formato AAAA-MM-DD. */
export function fechaHabana(fecha: string | Date): string {
  return formatoFecha.format(typeof fecha === "string" ? new Date(fecha) : fecha);
}

/** Últimos `dias` días (incluido hoy), del más antiguo al más reciente. */
export function ultimosDias(dias: number, hoy: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    out.push(fechaHabana(new Date(hoy.getTime() - i * 86_400_000)));
  }
  return out;
}

/**
 * Métricas del panel. Las ventas excluyen pedidos cancelados; "por cobrar"
 * suma los pedidos activos con pago pendiente.
 */
export function resumirPedidos(
  pedidos: readonly PedidoDashboard[],
  opciones: { dias: number; hoy?: Date; top?: number },
): ResumenDashboard {
  const fechas = ultimosDias(opciones.dias, opciones.hoy);
  const desde = fechas[0] ?? "";
  const enRango = pedidos.filter((p) => fechaHabana(p.creadoEn) >= desde);
  const validos = enRango.filter((p) => p.estado !== "cancelado");

  const ventas = validos.reduce((acc, p) => acc + p.totalCentavos, 0);

  const porDia = new Map(fechas.map((f) => [f, { fecha: f, total: 0, pedidos: 0 }]));
  for (const p of validos) {
    const d = porDia.get(fechaHabana(p.creadoEn));
    if (d) {
      d.total += p.totalCentavos;
      d.pedidos += 1;
    }
  }

  const productos = new Map<string, { nombre: string; unidades: number; ingresos: number }>();
  for (const p of validos) {
    for (const it of p.items) {
      const clave = it.productoId ?? `nombre:${it.nombre}`;
      const acc = productos.get(clave) ?? { nombre: it.nombre, unidades: 0, ingresos: 0 };
      acc.unidades += it.cantidad;
      acc.ingresos += it.cantidad * it.precioCentavos;
      productos.set(clave, acc);
    }
  }

  const municipios = new Map<string, { municipio: string; pedidos: number; total: number }>();
  for (const p of validos) {
    const acc = municipios.get(p.municipio) ?? { municipio: p.municipio, pedidos: 0, total: 0 };
    acc.pedidos += 1;
    acc.total += p.totalCentavos;
    municipios.set(p.municipio, acc);
  }

  return {
    ventas,
    pedidos: validos.length,
    ticketMedio: validos.length ? Math.round(ventas / validos.length) : 0,
    pendientes: enRango.filter((p) => p.estado === "pendiente").length,
    porCobrar: validos
      .filter((p) => p.estadoPago === "pendiente")
      .reduce((acc, p) => acc + p.totalCentavos, 0),
    ventasPorDia: [...porDia.values()],
    topProductos: [...productos.values()]
      .sort((a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos)
      .slice(0, opciones.top ?? 5),
    porMunicipio: [...municipios.values()].sort((a, b) => b.pedidos - a.pedidos || b.total - a.total),
  };
}
