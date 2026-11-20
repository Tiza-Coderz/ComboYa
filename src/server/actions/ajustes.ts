"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { configuracionSchema, erroresPorCampo, tasaSchema } from "@/domain/schemas";
import { adminOpcional } from "../auth";
import { TAG_CATALOGO } from "../supabase/public";
import type { EstadoForm } from "./admin-catalogo";

const INICIAL: EstadoForm = { ok: false, mensaje: null, errores: {} };

/**
 * Registra una tasa nueva. El histórico nunca se edita: cada cambio es una fila
 * con su fecha y quién la puso. Los pedidos guardan la tasa del momento.
 */
export async function registrarTasa(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const admin = await adminOpcional();
  if (!admin) redirect("/admin/login");
  const r = tasaSchema.safeParse(Object.fromEntries(form));
  if (!r.success)
    return { ...INICIAL, mensaje: "Revise la tasa.", errores: erroresPorCampo(r.error) };
  const { error } = await admin.supabase
    .from("tasas_cambio")
    .insert({ moneda: r.data.moneda, tasa: r.data.tasa, creado_por: admin.user.id });
  if (error) return { ...INICIAL, mensaje: "No se pudo guardar la tasa." };
  revalidateTag(TAG_CATALOGO);
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    mensaje: `Tasa actualizada: 1 USD = ${r.data.tasa} ${r.data.moneda}. Los precios de la tienda ya la usan.`,
    errores: {},
  };
}

export async function guardarConfiguracion(_prev: EstadoForm, form: FormData): Promise<EstadoForm> {
  const admin = await adminOpcional();
  if (!admin) redirect("/admin/login");
  const r = configuracionSchema.safeParse(Object.fromEntries(form));
  if (!r.success)
    return { ...INICIAL, mensaje: "Revise los campos.", errores: erroresPorCampo(r.error) };
  const { error } = await admin.supabase
    .from("configuracion")
    .update({
      ...r.data,
      email_contacto: r.data.email_contacto ?? null,
      horario: r.data.horario ?? null,
    })
    .eq("id", true);
  if (error) return { ...INICIAL, mensaje: "No se pudo guardar." };
  revalidateTag(TAG_CATALOGO);
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Datos del negocio guardados.", errores: {} };
}
