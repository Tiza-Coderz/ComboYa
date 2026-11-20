import "server-only";
import { aCentavos } from "@/domain/money";
import { urlImagen } from "@/lib/utils";
import type { Banner, Categoria, Configuracion, Producto, Zona } from "../types";

/* Filas tal como llegan de PostgREST (numeric llega como number). */

export interface ProductoRow {
  id: string;
  categoria_id: string;
  tipo: "producto" | "combo";
  nombre: string;
  slug: string;
  descripcion: string;
  precio_usd: number | string;
  unidad: string | null;
  imagen_url: string | null;
  stock: number | null;
  activo: boolean;
  destacado: boolean;
  categorias?: { nombre: string; slug: string } | null;
}

export const COLUMNAS_PRODUCTO =
  "id, categoria_id, tipo, nombre, slug, descripcion, precio_usd, unidad, imagen_url, stock, activo, destacado, categorias(nombre, slug)";

export function aProducto(r: ProductoRow): Producto {
  return {
    id: r.id,
    categoriaId: r.categoria_id,
    categoria: r.categorias ?? null,
    tipo: r.tipo,
    nombre: r.nombre,
    slug: r.slug,
    descripcion: r.descripcion,
    precioCentavos: aCentavos(r.precio_usd),
    unidad: r.unidad,
    imagenRuta: r.imagen_url,
    imagen: urlImagen(r.imagen_url),
    stock: r.stock,
    activo: r.activo,
    destacado: r.destacado,
  };
}

export function aCategoria(r: {
  id: string;
  nombre: string;
  slug: string;
  icono: string | null;
  orden: number;
}): Categoria {
  return { id: r.id, nombre: r.nombre, slug: r.slug, icono: r.icono, orden: r.orden };
}

export function aZona(r: {
  id: string;
  municipio: string;
  costo_usd: number | string;
  dias_min: number;
  dias_max: number;
  activa: boolean;
}): Zona {
  return {
    id: r.id,
    municipio: r.municipio,
    costoCentavos: aCentavos(r.costo_usd),
    diasMin: r.dias_min,
    diasMax: r.dias_max,
    activa: r.activa,
  };
}

export function aBanner(r: {
  id: string;
  titulo: string;
  subtitulo: string | null;
  imagen_url: string | null;
  enlace: string | null;
  orden: number;
  activo: boolean;
}): Banner {
  return {
    id: r.id,
    titulo: r.titulo,
    subtitulo: r.subtitulo,
    imagen: urlImagen(r.imagen_url),
    enlace: r.enlace,
    orden: r.orden,
    activo: r.activo,
  };
}

export function aConfiguracion(
  r: {
    nombre_negocio: string;
    whatsapp_negocio: string;
    email_contacto: string | null;
    horario: string | null;
  } | null,
  whatsappRespaldo: string,
): Configuracion {
  return {
    nombreNegocio: r?.nombre_negocio ?? "ComboYa",
    whatsappNegocio: r?.whatsapp_negocio ?? whatsappRespaldo,
    emailContacto: r?.email_contacto ?? null,
    horario: r?.horario ?? null,
  };
}

/** Error de Supabase → Error con contexto (los mensajes no se muestran al cliente). */
export function errorDeDatos(contexto: string, e: { message: string } | null): never {
  throw new Error(`${contexto}: ${e?.message ?? "error desconocido"}`);
}
