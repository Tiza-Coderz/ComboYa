import "server-only";
import type { Tasas } from "@/domain/money";
import { publicEnv } from "@/lib/env";
import { createSupabasePublicClient } from "../supabase/public";
import type { Banner, Categoria, Configuracion, Producto, ProductoDetalle, Zona } from "../types";
import {
  aBanner,
  aCategoria,
  aConfiguracion,
  aProducto,
  aZona,
  COLUMNAS_PRODUCTO,
  errorDeDatos,
  type ProductoRow,
} from "./mappers";

export const POR_PAGINA = 12;

export type Orden = "relevancia" | "precio-asc" | "precio-desc" | "nombre";

export interface FiltrosCatalogo {
  q?: string;
  categoria?: string;
  tipo?: "producto" | "combo";
  orden?: Orden;
  precioMax?: number;
  pagina?: number;
}

/** Deja solo letras, números y espacios: el texto va dentro de un filtro de PostgREST. */
export function limpiarBusqueda(q: string): string {
  return q
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await createSupabasePublicClient()
    .from("categorias")
    .select("id, nombre, slug, icono, orden")
    .order("orden");
  if (error) errorDeDatos("categorías", error);
  return data.map(aCategoria);
}

export async function listarDestacados(
  tipo: "producto" | "combo",
  limite = 8,
): Promise<Producto[]> {
  const { data, error } = await createSupabasePublicClient()
    .from("productos")
    .select(COLUMNAS_PRODUCTO)
    .eq("activo", true)
    .eq("destacado", true)
    .eq("tipo", tipo)
    .order("precio_usd", { ascending: tipo === "producto" })
    .limit(limite)
    .overrideTypes<ProductoRow[], { merge: false }>();
  if (error) errorDeDatos("destacados", error);
  return data.map(aProducto);
}

export async function buscarProductos(
  f: FiltrosCatalogo,
): Promise<{ items: Producto[]; total: number; paginas: number }> {
  const pagina = Math.max(1, f.pagina ?? 1);
  const columnas = f.categoria
    ? COLUMNAS_PRODUCTO.replace("categorias(nombre, slug)", "categorias!inner(nombre, slug)")
    : COLUMNAS_PRODUCTO;

  let consulta = createSupabasePublicClient()
    .from("productos")
    .select(columnas, { count: "exact" })
    .eq("activo", true);

  if (f.categoria) consulta = consulta.eq("categorias.slug", f.categoria);
  if (f.tipo) consulta = consulta.eq("tipo", f.tipo);
  if (f.precioMax !== undefined && f.precioMax > 0)
    consulta = consulta.lte("precio_usd", f.precioMax);

  const q = f.q ? limpiarBusqueda(f.q) : "";
  if (q) {
    // Coincidencia parcial en el nombre ("arro" → Arroz) o búsqueda de texto en
    // español sobre nombre, unidad y descripción ("frijol" → Frijoles negros).
    consulta = consulta.or(`nombre.ilike."%${q}%",busqueda.wfts(spanish)."${q}"`);
  }

  switch (f.orden ?? "relevancia") {
    case "precio-asc":
      consulta = consulta.order("precio_usd", { ascending: true });
      break;
    case "precio-desc":
      consulta = consulta.order("precio_usd", { ascending: false });
      break;
    case "nombre":
      consulta = consulta.order("nombre");
      break;
    default:
      consulta = consulta
        .order("destacado", { ascending: false })
        .order("tipo", { ascending: false })
        .order("nombre");
  }

  const desde = (pagina - 1) * POR_PAGINA;
  const { data, error, count } = await consulta
    .range(desde, desde + POR_PAGINA - 1)
    .overrideTypes<ProductoRow[], { merge: false }>();
  if (error) errorDeDatos("búsqueda", error);
  const total = count ?? data.length;
  return { items: data.map(aProducto), total, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function obtenerProducto(slug: string): Promise<ProductoDetalle | null> {
  const { data, error } = await createSupabasePublicClient()
    .from("productos")
    .select(
      `${COLUMNAS_PRODUCTO}, combo_items!combo_items_combo_id_fkey(cantidad, producto:productos!combo_items_producto_id_fkey(${COLUMNAS_PRODUCTO}))`,
    )
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle()
    .overrideTypes<
      (ProductoRow & { combo_items: { cantidad: number; producto: ProductoRow | null }[] }) | null,
      { merge: false }
    >();
  if (error) errorDeDatos("producto", error);
  if (!data) return null;
  return {
    ...aProducto(data),
    items: data.combo_items
      .filter((i): i is { cantidad: number; producto: ProductoRow } => i.producto !== null)
      .map((i) => ({ cantidad: i.cantidad, producto: aProducto(i.producto) }))
      .sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, "es")),
  };
}

/** Combos que incluyen un producto (para sugerirlos en su ficha). */
export async function combosConProducto(productoId: string): Promise<Producto[]> {
  const { data, error } = await createSupabasePublicClient()
    .from("combo_items")
    .select(`combo:productos!combo_items_combo_id_fkey(${COLUMNAS_PRODUCTO})`)
    .eq("producto_id", productoId)
    .limit(4)
    .overrideTypes<{ combo: ProductoRow | null }[], { merge: false }>();
  if (error) errorDeDatos("combos del producto", error);
  return data
    .map((r) => r.combo)
    .filter((c): c is ProductoRow => c !== null && c.activo)
    .map(aProducto);
}

export async function productosRelacionados(producto: Producto, limite = 4): Promise<Producto[]> {
  const { data, error } = await createSupabasePublicClient()
    .from("productos")
    .select(COLUMNAS_PRODUCTO)
    .eq("activo", true)
    .eq("categoria_id", producto.categoriaId)
    .neq("id", producto.id)
    .order("destacado", { ascending: false })
    .limit(limite)
    .overrideTypes<ProductoRow[], { merge: false }>();
  if (error) errorDeDatos("relacionados", error);
  return data.map(aProducto);
}

/** Precios vigentes de los productos del carrito (para sincronizarlo). */
export async function productosPorIds(ids: string[]): Promise<Producto[]> {
  if (ids.length === 0) return [];
  const { data, error } = await createSupabasePublicClient()
    .from("productos")
    .select(COLUMNAS_PRODUCTO)
    .in("id", ids.slice(0, 50))
    .overrideTypes<ProductoRow[], { merge: false }>();
  if (error) errorDeDatos("productos del carrito", error);
  return data.map(aProducto);
}

export async function listarZonas(): Promise<Zona[]> {
  const { data, error } = await createSupabasePublicClient()
    .from("zonas_entrega")
    .select("id, municipio, costo_usd, dias_min, dias_max, activa")
    .eq("activa", true)
    .order("costo_usd")
    .order("municipio");
  if (error) errorDeDatos("zonas", error);
  return data.map(aZona);
}

export async function listarBanners(): Promise<Banner[]> {
  const { data, error } = await createSupabasePublicClient()
    .from("banners")
    .select("id, titulo, subtitulo, imagen_url, enlace, orden, activo")
    .eq("activo", true)
    .order("orden");
  if (error) errorDeDatos("banners", error);
  return data.map(aBanner);
}

export async function obtenerTasas(): Promise<Tasas> {
  const { data, error } = await createSupabasePublicClient()
    .from("tasas_vigentes")
    .select("moneda, tasa")
    .overrideTypes<{ moneda: "CUP" | "EUR"; tasa: number | string }[], { merge: false }>();
  if (error) errorDeDatos("tasas", error);
  const tasas: Tasas = {};
  for (const t of data) tasas[t.moneda] = Number(t.tasa);
  return tasas;
}

export async function obtenerConfiguracion(): Promise<Configuracion> {
  const { data, error } = await createSupabasePublicClient()
    .from("configuracion")
    .select("nombre_negocio, whatsapp_negocio, email_contacto, horario")
    .maybeSingle();
  if (error) errorDeDatos("configuración", error);
  return aConfiguracion(data, publicEnv.NEXT_PUBLIC_WHATSAPP_NEGOCIO);
}

export async function listarSlugs(): Promise<{ slug: string; tipo: string }[]> {
  const { data, error } = await createSupabasePublicClient()
    .from("productos")
    .select("slug, tipo")
    .eq("activo", true);
  if (error) errorDeDatos("slugs", error);
  return data;
}

/**
 * Datos comunes del layout de la tienda. Si Supabase no responde (p. ej. en el
 * build de CI sin credenciales reales) la tienda sigue mostrándose con valores
 * por defecto en vez de romperse.
 */
export async function datosDelLayout(): Promise<{ tasas: Tasas; config: Configuracion }> {
  const [tasas, config] = await Promise.allSettled([obtenerTasas(), obtenerConfiguracion()]);
  return {
    tasas: tasas.status === "fulfilled" ? tasas.value : {},
    config:
      config.status === "fulfilled"
        ? config.value
        : aConfiguracion(null, publicEnv.NEXT_PUBLIC_WHATSAPP_NEGOCIO),
  };
}
