"use server";

import { revalidateTag } from "next/cache";
import { erroresPorCampo, pedidoSchema } from "@/domain/schemas";
import { crearPedido, type ResultadoPedido } from "../services/pedidos";
import { TAG_CATALOGO } from "../supabase/public";

/** Server Action del checkout. Valida en el servidor aunque el cliente ya lo hizo. */
export async function confirmarPedido(datos: unknown): Promise<ResultadoPedido> {
  const r = pedidoSchema.safeParse(datos);
  if (!r.success) {
    return {
      ok: false,
      mensaje: "Revise los datos marcados en rojo.",
      errores: erroresPorCampo(r.error),
    };
  }
  const resultado = await crearPedido(r.data);
  // El stock cambió: que el catálogo cacheado se refresque.
  if (resultado.ok) revalidateTag(TAG_CATALOGO);
  return resultado;
}
