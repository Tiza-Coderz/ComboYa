"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  categoriaSchema,
  comboItemsSchema,
  erroresPorCampo,
  productoSchema,
  zonaSchema,
} from "@/domain/schemas";
import { adminOpcional } from "../auth";
import { TAG_CATALOGO } from "../supabase/public";

export interface EstadoForm {
  ok: boolean;
  mensaje: string | null;
  errores: Record<string, string>;
}

const INICIAL: EstadoForm = { ok: false, mensaje: null, errores: {} };
const idOpcional = z.uuid().optional().catch(undefined);

async function admin() {
  const a = await adminOpcional();
  if (!a) redirect("/admin/login");
  return a;
}

function refrescar() {
  revalidateTag(TAG_CATALOGO);
  revalidatePath("/admin", "layout");
}

/** Traduce errores habituales de Postgres a mensajes para el admin. */
function mensajeBd(e: { code?: string; message: string }): string {
  if (e.code === "23505") return "Ya existe un registro con ese nombre o identificador (slug).";
  if (e.code === "23503") return "No se puede borrar: está en uso. Puede desactivarlo en su lugar.";
  if (e.code === "42501") return "No tiene permisos para esta acción.";
  return "No se pudo guardar. Intente de nuevo.";
}

// ─── Productos y combos ─────────────────────────────────────────────────────

export async function guardarProducto(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await admin();
  const id = idOpcional.parse(form.get("id") || undefined);
  const tipo = form.get("tipo") === "combo" ? "combo" : "producto";

  const r = productoSchema.safeParse(Object.fromEntries(form));
  let items: z.infer<typeof comboItemsSchema> = [];
  const errores = r.success ? {} : erroresPorCampo(r.error);
  if (tipo === "combo") {
    let crudo: unknown = [];
    try {
      crudo = JSON.parse(String(form.get("items") ?? "[]"));
    } catch {
      /* se valida abajo */
    }
    const ri = comboItemsSchema.safeParse(crudo);
    if (ri.success) items = ri.data;
    else errores.items = ri.error.issues[0]?.message ?? "Revise los productos del combo";
  }
  if (!r.success || Object.keys(errores).length > 0) {
    return { ...INICIAL, mensaje: "Revise los campos marcados.", errores };
  }

  const fila = {
    ...r.data,
    tipo,
    unidad: r.data.unidad ?? null,
    imagen_url: r.data.imagen_url ?? null,
  };
  const { data, error } = id
    ? await supabase.from("productos").update(fila).eq("id", id).select("id").single()
    : await supabase.from("productos").insert(fila).select("id").single();
  if (error) return { ...INICIAL, mensaje: mensajeBd(error) };

  if (tipo === "combo") {
    const { error: e2 } = await supabase.rpc("guardar_combo_items", {
      p_combo_id: (data as { id: string }).id,
      p_items: items,
    });
    if (e2)
      return { ...INICIAL, mensaje: "Se guardó el combo pero no sus productos: " + mensajeBd(e2) };
  }

  refrescar();
  redirect(
    `/admin/${tipo === "combo" ? "combos" : "productos"}?ok=${encodeURIComponent(id ? "Cambios guardados." : "Creado correctamente.")}`,
  );
}

export async function alternarProducto(form: FormData) {
  const { supabase } = await admin();
  const id = z.uuid().parse(form.get("id"));
  const campo = form.get("campo") === "destacado" ? "destacado" : "activo";
  const valor = form.get("valor") === "true";
  await supabase
    .from("productos")
    .update({ [campo]: valor })
    .eq("id", id);
  refrescar();
}

export async function eliminarProducto(form: FormData) {
  const { supabase } = await admin();
  const id = z.uuid().parse(form.get("id"));
  const destino = form.get("tipo") === "combo" ? "combos" : "productos";
  const { error } = await supabase.from("productos").delete().eq("id", id);
  refrescar();
  redirect(
    `/admin/${destino}?${error ? "error" : "ok"}=${encodeURIComponent(error ? mensajeBd(error) : "Eliminado.")}`,
  );
}

// ─── Categorías ─────────────────────────────────────────────────────────────

export async function guardarCategoria(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await admin();
  const id = idOpcional.parse(form.get("id") || undefined);
  const r = categoriaSchema.safeParse(Object.fromEntries(form));
  if (!r.success)
    return { ...INICIAL, mensaje: "Revise los campos.", errores: erroresPorCampo(r.error) };
  const fila = { ...r.data, icono: r.data.icono ?? null };
  const { error } = id
    ? await supabase.from("categorias").update(fila).eq("id", id)
    : await supabase.from("categorias").insert(fila);
  if (error) return { ...INICIAL, mensaje: mensajeBd(error) };
  refrescar();
  return { ok: true, mensaje: id ? "Categoría actualizada." : "Categoría creada.", errores: {} };
}

export async function eliminarCategoria(form: FormData) {
  const { supabase } = await admin();
  const id = z.uuid().parse(form.get("id"));
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  refrescar();
  redirect(
    `/admin/categorias?${error ? "error" : "ok"}=${encodeURIComponent(
      error ? "No se puede borrar una categoría con productos." : "Categoría eliminada.",
    )}`,
  );
}

// ─── Zonas de entrega ───────────────────────────────────────────────────────

export async function guardarZona(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await admin();
  const id = idOpcional.parse(form.get("id") || undefined);
  const r = zonaSchema.safeParse(Object.fromEntries(form));
  if (!r.success)
    return { ...INICIAL, mensaje: "Revise los campos.", errores: erroresPorCampo(r.error) };
  const { error } = id
    ? await supabase.from("zonas_entrega").update(r.data).eq("id", id)
    : await supabase.from("zonas_entrega").insert(r.data);
  if (error) return { ...INICIAL, mensaje: mensajeBd(error) };
  refrescar();
  return { ok: true, mensaje: id ? `${r.data.municipio}: guardado.` : "Zona creada.", errores: {} };
}

export async function eliminarZona(form: FormData) {
  const { supabase } = await admin();
  const id = z.uuid().parse(form.get("id"));
  const { error } = await supabase.from("zonas_entrega").delete().eq("id", id);
  refrescar();
  redirect(
    `/admin/zonas?${error ? "error" : "ok"}=${encodeURIComponent(error ? mensajeBd(error) : "Zona eliminada.")}`,
  );
}

// ─── Imágenes ───────────────────────────────────────────────────────────────

/**
 * Sube a Storage una imagen ya comprimida a WebP en el navegador. Se hace en el
 * servidor para que la sesión tenga un único dueño (dos clientes renovando el
 * mismo refresh token invalidan la sesión).
 */
export async function subirImagen(form: FormData): Promise<{ url: string } | { error: string }> {
  const { supabase } = await admin();
  const archivo = form.get("archivo");
  if (!(archivo instanceof Blob) || archivo.size === 0)
    return { error: "No llegó ninguna imagen." };
  if (archivo.type !== "image/webp") return { error: "Formato no admitido." };
  if (archivo.size > 1_500_000) return { error: "La imagen es demasiado grande (máx. 1,5 MB)." };
  const ruta = `subidas/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from("catalogo")
    .upload(ruta, archivo, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) return { error: "No se pudo subir la imagen." };
  return { url: supabase.storage.from("catalogo").getPublicUrl(ruta).data.publicUrl };
}
