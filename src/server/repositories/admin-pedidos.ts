import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PedidoDashboard } from "@/domain/dashboard";
import { aCentavos } from "@/domain/money";
import {
  esEstadoPago,
  esEstadoPedido,
  type EstadoPago,
  type EstadoPedido,
  type MetodoPago,
} from "@/domain/order-status";
import { errorDeDatos } from "./mappers";

export const PEDIDOS_POR_PAGINA = 20;

export interface FiltrosPedidos {
  estado?: EstadoPedido;
  pago?: EstadoPago;
  municipio?: string;
  q?: string;
  pagina?: number;
}

export interface PedidoResumen {
  id: string;
  codigo: string;
  creadoEn: string;
  estado: EstadoPedido;
  estadoPago: EstadoPago;
  metodoPago: MetodoPago;
  compradorNombre: string;
  compradorPais: string;
  destNombre: string;
  municipio: string;
  total: number;
}

export interface PedidoAdmin extends PedidoResumen {
  compradorTelefono: string;
  compradorEmail: string;
  destCarne: string | null;
  destTelefono: string;
  direccion: string;
  referencia: string | null;
  mensajeFamilia: string | null;
  subtotal: number;
  envio: number;
  tasaCup: number | null;
  tasaEur: number | null;
  notasInternas: string | null;
  pagadoEn: string | null;
  items: {
    id: string;
    nombre: string;
    tipo: "producto" | "combo";
    cantidad: number;
    precioCentavos: number;
  }[];
  eventos: { id: string; estado: EstadoPedido | null; nota: string; creadoEn: string }[];
}

interface PedidoRow {
  id: string;
  codigo: string;
  created_at: string;
  estado: EstadoPedido;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago;
  comprador_nombre: string;
  comprador_pais: string;
  dest_nombre: string;
  dest_municipio: string;
  total_usd: number;
}

const COLUMNAS_RESUMEN =
  "id, codigo, created_at, estado, estado_pago, metodo_pago, comprador_nombre, comprador_pais, dest_nombre, dest_municipio, total_usd";

function aResumen(r: PedidoRow): PedidoResumen {
  return {
    id: r.id,
    codigo: r.codigo,
    creadoEn: r.created_at,
    estado: r.estado,
    estadoPago: r.estado_pago,
    metodoPago: r.metodo_pago,
    compradorNombre: r.comprador_nombre,
    compradorPais: r.comprador_pais,
    destNombre: r.dest_nombre,
    municipio: r.dest_municipio,
    total: aCentavos(r.total_usd),
  };
}

export function leerFiltrosPedidos(
  sp: Record<string, string | string[] | undefined>,
): FiltrosPedidos {
  const uno = (k: string) => (typeof sp[k] === "string" ? sp[k].trim() : "");
  const estado = uno("estado");
  const pago = uno("pago");
  return {
    estado: esEstadoPedido(estado) ? estado : undefined,
    pago: esEstadoPago(pago) ? pago : undefined,
    municipio: uno("municipio") || undefined,
    q:
      uno("q")
        .replace(/[^\p{L}\p{N} -]/gu, "")
        .slice(0, 40) || undefined,
    pagina: Math.max(1, Number(uno("pagina")) || 1),
  };
}

export async function listarPedidos(supabase: SupabaseClient, f: FiltrosPedidos) {
  const pagina = f.pagina ?? 1;
  let q = supabase
    .from("pedidos")
    .select(COLUMNAS_RESUMEN, { count: "exact" })
    .order("created_at", { ascending: false });
  if (f.estado) q = q.eq("estado", f.estado);
  if (f.pago) q = q.eq("estado_pago", f.pago);
  if (f.municipio) q = q.eq("dest_municipio", f.municipio);
  if (f.q) {
    q = q.or(
      `codigo.ilike."%${f.q}%",comprador_nombre.ilike."%${f.q}%",dest_nombre.ilike."%${f.q}%"`,
    );
  }
  const desde = (pagina - 1) * PEDIDOS_POR_PAGINA;
  const { data, error, count } = await q
    .range(desde, desde + PEDIDOS_POR_PAGINA - 1)
    .overrideTypes<PedidoRow[], { merge: false }>();
  if (error) errorDeDatos("pedidos", error);
  const total = count ?? data.length;
  return {
    pedidos: data.map(aResumen),
    total,
    paginas: Math.max(1, Math.ceil(total / PEDIDOS_POR_PAGINA)),
  };
}

export async function contarPorEstado(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("pedidos")
    .select("estado")
    .overrideTypes<{ estado: EstadoPedido }[], { merge: false }>();
  if (error) errorDeDatos("conteo de pedidos", error);
  const conteo: Partial<Record<EstadoPedido, number>> = {};
  for (const r of data) conteo[r.estado] = (conteo[r.estado] ?? 0) + 1;
  return conteo;
}

export async function obtenerPedidoAdmin(
  supabase: SupabaseClient,
  id: string,
): Promise<PedidoAdmin | null> {
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      `${COLUMNAS_RESUMEN}, comprador_telefono, comprador_email, dest_carne, dest_telefono, dest_direccion, dest_referencia, mensaje_familia, subtotal_usd, envio_usd, tasa_cup, tasa_eur, notas_internas, pagado_at,
       pedido_items(id, nombre, tipo, cantidad, precio_unit_usd),
       pedido_eventos(id, estado, nota, created_at)`,
    )
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<
      | (PedidoRow & {
          comprador_telefono: string;
          comprador_email: string;
          dest_carne: string | null;
          dest_telefono: string;
          dest_direccion: string;
          dest_referencia: string | null;
          mensaje_familia: string | null;
          subtotal_usd: number;
          envio_usd: number;
          tasa_cup: number | null;
          tasa_eur: number | null;
          notas_internas: string | null;
          pagado_at: string | null;
          pedido_items: {
            id: string;
            nombre: string;
            tipo: "producto" | "combo";
            cantidad: number;
            precio_unit_usd: number;
          }[];
          pedido_eventos: {
            id: string;
            estado: EstadoPedido | null;
            nota: string;
            created_at: string;
          }[];
        })
      | null,
      { merge: false }
    >();
  if (error) errorDeDatos("pedido", error);
  if (!data) return null;
  return {
    ...aResumen(data),
    compradorTelefono: data.comprador_telefono,
    compradorEmail: data.comprador_email,
    destCarne: data.dest_carne,
    destTelefono: data.dest_telefono,
    direccion: data.dest_direccion,
    referencia: data.dest_referencia,
    mensajeFamilia: data.mensaje_familia,
    subtotal: aCentavos(data.subtotal_usd),
    envio: aCentavos(data.envio_usd),
    tasaCup: data.tasa_cup === null ? null : Number(data.tasa_cup),
    tasaEur: data.tasa_eur === null ? null : Number(data.tasa_eur),
    notasInternas: data.notas_internas,
    pagadoEn: data.pagado_at,
    items: data.pedido_items
      .map((i) => ({
        id: i.id,
        nombre: i.nombre,
        tipo: i.tipo,
        cantidad: i.cantidad,
        precioCentavos: aCentavos(i.precio_unit_usd),
      }))
      .sort((a, b) =>
        a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre, "es") : a.tipo === "combo" ? -1 : 1,
      ),
    eventos: data.pedido_eventos
      .map((e) => ({ id: e.id, estado: e.estado, nota: e.nota, creadoEn: e.created_at }))
      .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn)),
  };
}

/** Pedidos de los últimos `dias` días con sus líneas, para el dashboard. */
export async function pedidosParaDashboard(
  supabase: SupabaseClient,
  dias: number,
): Promise<PedidoDashboard[]> {
  const desde = new Date(Date.now() - (dias + 1) * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("pedidos")
    .select(
      "created_at, total_usd, estado, estado_pago, dest_municipio, pedido_items(producto_id, nombre, cantidad, precio_unit_usd)",
    )
    .gte("created_at", desde)
    .overrideTypes<
      {
        created_at: string;
        total_usd: number;
        estado: EstadoPedido;
        estado_pago: EstadoPago;
        dest_municipio: string;
        pedido_items: {
          producto_id: string | null;
          nombre: string;
          cantidad: number;
          precio_unit_usd: number;
        }[];
      }[],
      { merge: false }
    >();
  if (error) errorDeDatos("dashboard", error);
  return data.map((r) => ({
    creadoEn: r.created_at,
    totalCentavos: aCentavos(r.total_usd),
    estado: r.estado,
    estadoPago: r.estado_pago,
    municipio: r.dest_municipio,
    items: r.pedido_items.map((i) => ({
      productoId: i.producto_id,
      nombre: i.nombre,
      cantidad: i.cantidad,
      precioCentavos: aCentavos(i.precio_unit_usd),
    })),
  }));
}
