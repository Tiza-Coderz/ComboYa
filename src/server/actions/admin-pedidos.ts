"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  esEstadoPago,
  esEstadoPedido,
  puedeCambiarEstado,
  puedeCambiarPago,
  type EstadoPago,
  type EstadoPedido,
} from "@/domain/order-status";
import { adminOpcional } from "../auth";

/*
 * Acciones sobre pedidos. Se invocan desde formularios (funcionan sin JS) y
 * vuelven al detalle con ?ok= o ?error=. La BD vuelve a validar las
 * transiciones (trigger) y los permisos (RLS).
 */

const idSchema = z.uuid();

function volver(id: string, param: "ok" | "error", mensaje: string): never {
  revalidatePath(`/admin/pedidos/${id}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  redirect(`/admin/pedidos/${id}?${param}=${encodeURIComponent(mensaje)}`);
}

async function contexto(form: FormData) {
  const admin = await adminOpcional();
  if (!admin) redirect("/admin/login");
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success) redirect("/admin/pedidos");
  const { data } = await admin.supabase
    .from("pedidos")
    .select("estado, estado_pago")
    .eq("id", id.data)
    .maybeSingle();
  if (!data) redirect("/admin/pedidos");
  return {
    ...admin,
    id: id.data,
    actual: data as { estado: EstadoPedido; estado_pago: EstadoPago },
  };
}

export async function cambiarEstadoPedido(form: FormData) {
  const { supabase, id, actual } = await contexto(form);
  const nuevo = String(form.get("estado"));
  if (!esEstadoPedido(nuevo) || !puedeCambiarEstado(actual.estado, nuevo)) {
    volver(id, "error", "Ese cambio de estado no está permitido.");
  }
  const { error } = await supabase.from("pedidos").update({ estado: nuevo }).eq("id", id);
  if (error) volver(id, "error", "No se pudo cambiar el estado.");
  volver(id, "ok", "Estado actualizado.");
}

export async function cambiarPagoPedido(form: FormData) {
  const { supabase, id, actual } = await contexto(form);
  const nuevo = String(form.get("estado_pago"));
  if (!esEstadoPago(nuevo) || !puedeCambiarPago(actual.estado_pago, nuevo)) {
    volver(id, "error", "Ese cambio de pago no está permitido.");
  }
  const { error } = await supabase.from("pedidos").update({ estado_pago: nuevo }).eq("id", id);
  if (error) volver(id, "error", "No se pudo actualizar el pago.");
  volver(id, "ok", nuevo === "pagado" ? "Pago registrado." : "Pago actualizado.");
}

export async function guardarNotasPedido(form: FormData) {
  const { supabase, id } = await contexto(form);
  const notas = String(form.get("notas") ?? "")
    .trim()
    .slice(0, 2000);
  const { error } = await supabase
    .from("pedidos")
    .update({ notas_internas: notas || null })
    .eq("id", id);
  if (error) volver(id, "error", "No se pudieron guardar las notas.");
  volver(id, "ok", "Notas guardadas.");
}

export async function agregarEventoPedido(form: FormData) {
  const { supabase, id } = await contexto(form);
  const nota = String(form.get("nota") ?? "")
    .trim()
    .slice(0, 200);
  if (nota.length < 3) volver(id, "error", "Escriba una nota más descriptiva.");
  const { error } = await supabase.from("pedido_eventos").insert({ pedido_id: id, nota });
  if (error) volver(id, "error", "No se pudo añadir la nota.");
  volver(id, "ok", "Nota añadida al seguimiento (la ve el cliente).");
}
