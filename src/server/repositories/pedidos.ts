import "server-only";
import { aCentavos } from "@/domain/money";
import { esCodigoValido } from "@/domain/order-code";
import type { EstadoPago, EstadoPedido, MetodoPago } from "@/domain/order-status";
import type { Pedido } from "@/domain/schemas";
import { createSupabaseAnonClient } from "../supabase/public";
import type { Seguimiento, TipoProducto } from "../types";

interface SeguimientoRow {
  codigo: string;
  estado: EstadoPedido;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago;
  created_at: string;
  destinatario: string;
  municipio: string;
  dias_min: number | null;
  dias_max: number | null;
  subtotal_usd: number;
  envio_usd: number;
  total_usd: number;
  tasa_cup: number | null;
  tasa_eur: number | null;
  items: { nombre: string; tipo: TipoProducto; cantidad: number; precio_unit_usd: number }[];
  eventos: { estado: EstadoPedido | null; nota: string; created_at: string }[];
}

/** Seguimiento público (RPC con datos mínimos, sin teléfonos ni carné). */
export async function obtenerSeguimiento(codigo: string): Promise<Seguimiento | null> {
  if (!esCodigoValido(codigo)) return null;
  const { data, error } = await createSupabaseAnonClient().rpc("obtener_seguimiento", {
    p_codigo: codigo,
  });
  if (error) throw new Error(`seguimiento: ${error.message}`);
  const r = data as SeguimientoRow | null;
  if (!r) return null;
  return {
    codigo: r.codigo,
    estado: r.estado,
    estadoPago: r.estado_pago,
    metodoPago: r.metodo_pago,
    creadoEn: r.created_at,
    destinatario: r.destinatario,
    municipio: r.municipio,
    diasMin: r.dias_min,
    diasMax: r.dias_max,
    subtotal: aCentavos(r.subtotal_usd),
    envio: aCentavos(r.envio_usd),
    total: aCentavos(r.total_usd),
    tasaCup: r.tasa_cup === null ? null : Number(r.tasa_cup),
    tasaEur: r.tasa_eur === null ? null : Number(r.tasa_eur),
    items: r.items.map((i) => ({
      nombre: i.nombre,
      tipo: i.tipo,
      cantidad: i.cantidad,
      precioCentavos: aCentavos(i.precio_unit_usd),
    })),
    eventos: r.eventos.map((e) => ({ estado: e.estado, nota: e.nota, creadoEn: e.created_at })),
  };
}

export interface PedidoCreado {
  codigo: string;
  municipio: string;
  diasMin: number;
  diasMax: number;
}

/** Crea el pedido con la RPC. Los precios y el envío los pone la base de datos. */
export async function insertarPedido(p: Pedido): Promise<PedidoCreado> {
  const { data, error } = await createSupabaseAnonClient().rpc("crear_pedido", { p_pedido: p });
  if (error) throw new ErrorPedido(error.message, error.code);
  const r = data as { codigo: string; municipio: string; dias_min: number; dias_max: number };
  return { codigo: r.codigo, municipio: r.municipio, diasMin: r.dias_min, diasMax: r.dias_max };
}

export class ErrorPedido extends Error {
  constructor(
    message: string,
    readonly codigoSql?: string,
  ) {
    super(message);
    this.name = "ErrorPedido";
  }
}
