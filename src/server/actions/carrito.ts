"use server";

import { z } from "zod";
import type { ProductoActual } from "@/domain/cart";
import { productosPorIds } from "../repositories/catalogo";

const idsSchema = z.array(z.uuid()).max(50);

/**
 * Precios y disponibilidad vigentes de los productos del carrito. El cliente
 * los usa para avisar de cambios; al crear el pedido la BD vuelve a calcularlos.
 */
export async function preciosActuales(ids: string[]): Promise<ProductoActual[] | null> {
  const r = idsSchema.safeParse(ids);
  if (!r.success) return [];
  try {
    const productos = await productosPorIds(r.data);
    return productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precioCentavos: p.precioCentavos,
      disponible: p.activo && (p.stock === null || p.stock > 0),
    }));
  } catch {
    return null;
  }
}
