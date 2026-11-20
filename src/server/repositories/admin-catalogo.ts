import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Categoria, Producto, ProductoDetalle, Zona } from "../types";
import {
  aCategoria,
  aProducto,
  aZona,
  COLUMNAS_PRODUCTO,
  errorDeDatos,
  type ProductoRow,
} from "./mappers";

/* Lecturas del panel: usan la sesión del admin (RLS deja ver inactivos). */

export async function listarProductosAdmin(
  supabase: SupabaseClient,
  f: { tipo: "producto" | "combo"; q?: string; categoria?: string },
): Promise<Producto[]> {
  let q = supabase
    .from("productos")
    .select(COLUMNAS_PRODUCTO)
    .eq("tipo", f.tipo)
    .order("activo", { ascending: false })
    .order("nombre");
  if (f.q) q = q.ilike("nombre", `%${f.q.replace(/[%_,()"]/g, "")}%`);
  if (f.categoria) q = q.eq("categoria_id", f.categoria);
  const { data, error } = await q.overrideTypes<ProductoRow[], { merge: false }>();
  if (error) errorDeDatos("productos", error);
  return data.map(aProducto);
}

export async function obtenerProductoAdmin(
  supabase: SupabaseClient,
  id: string,
): Promise<ProductoDetalle | null> {
  const { data, error } = await supabase
    .from("productos")
    .select(
      `${COLUMNAS_PRODUCTO}, combo_items!combo_items_combo_id_fkey(cantidad, producto:productos!combo_items_producto_id_fkey(${COLUMNAS_PRODUCTO}))`,
    )
    .eq("id", id)
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
      .map((i) => ({ cantidad: i.cantidad, producto: aProducto(i.producto) })),
  };
}

export async function listarCategoriasAdmin(
  supabase: SupabaseClient,
): Promise<(Categoria & { productos: number })[]> {
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre, slug, icono, orden, productos(count)")
    .order("orden")
    .overrideTypes<
      {
        id: string;
        nombre: string;
        slug: string;
        icono: string | null;
        orden: number;
        productos: { count: number }[];
      }[],
      { merge: false }
    >();
  if (error) errorDeDatos("categorías", error);
  return data.map((c) => ({ ...aCategoria(c), productos: c.productos[0]?.count ?? 0 }));
}

export async function listarZonasAdmin(supabase: SupabaseClient): Promise<Zona[]> {
  const { data, error } = await supabase
    .from("zonas_entrega")
    .select("id, municipio, costo_usd, dias_min, dias_max, activa")
    .order("costo_usd")
    .order("municipio");
  if (error) errorDeDatos("zonas", error);
  return data.map(aZona);
}
