import { z } from "zod";
import { calcularSubtotal } from "./pricing";

export const MAX_CANTIDAD = 50;
export const MAX_DISTINTOS = 30;

const itemCarritoSchema = z.object({
  productoId: z.string().min(1),
  slug: z.string(),
  nombre: z.string(),
  tipo: z.enum(["producto", "combo"]),
  precioCentavos: z.number().int().nonnegative(),
  imagen: z.string().nullable(),
  unidad: z.string().nullable(),
  cantidad: z.number().int().min(1).max(MAX_CANTIDAD),
});

export type ItemCarrito = z.infer<typeof itemCarritoSchema>;
export type ProductoCarrito = Omit<ItemCarrito, "cantidad">;

export interface ResultadoCarrito {
  items: ItemCarrito[];
  aviso: string | null;
}

function limitar(n: number): number {
  return Math.min(MAX_CANTIDAD, Math.max(0, Math.trunc(n)));
}

export function agregarAlCarrito(
  items: readonly ItemCarrito[],
  producto: ProductoCarrito,
  cantidad = 1,
): ResultadoCarrito {
  const existente = items.find((i) => i.productoId === producto.productoId);
  if (existente) {
    const nueva = limitar(existente.cantidad + cantidad);
    return {
      items: items.map((i) =>
        i.productoId === producto.productoId ? { ...i, ...producto, cantidad: nueva } : i,
      ),
      aviso:
        existente.cantidad + cantidad > MAX_CANTIDAD
          ? `Máximo ${MAX_CANTIDAD} unidades por producto`
          : null,
    };
  }
  if (items.length >= MAX_DISTINTOS) {
    return {
      items: [...items],
      aviso: `Su carrito admite hasta ${MAX_DISTINTOS} productos distintos`,
    };
  }
  const nueva = limitar(cantidad);
  if (nueva === 0) return { items: [...items], aviso: null };
  return { items: [...items, { ...producto, cantidad: nueva }], aviso: null };
}

/** Cambia la cantidad; 0 o menos quita el producto. */
export function cambiarCantidad(
  items: readonly ItemCarrito[],
  productoId: string,
  cantidad: number,
): ItemCarrito[] {
  const nueva = limitar(cantidad);
  if (nueva === 0) return quitarDelCarrito(items, productoId);
  return items.map((i) => (i.productoId === productoId ? { ...i, cantidad: nueva } : i));
}

export function quitarDelCarrito(items: readonly ItemCarrito[], productoId: string): ItemCarrito[] {
  return items.filter((i) => i.productoId !== productoId);
}

export function contarUnidades(items: readonly ItemCarrito[]): number {
  return items.reduce((acc, i) => acc + i.cantidad, 0);
}

export function subtotalCarrito(items: readonly ItemCarrito[]): number {
  return calcularSubtotal(items);
}

/**
 * Lee el carrito guardado (localStorage) tolerando datos corruptos o de
 * versiones anteriores: descarta lo que no valide.
 */
export function parsearCarrito(raw: unknown): ItemCarrito[] {
  let datos: unknown = raw;
  if (typeof raw === "string") {
    try {
      datos = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(datos)) return [];
  const vistos = new Set<string>();
  const out: ItemCarrito[] = [];
  for (const d of datos) {
    const r = itemCarritoSchema.safeParse(d);
    if (r.success && !vistos.has(r.data.productoId)) {
      vistos.add(r.data.productoId);
      out.push(r.data);
    }
    if (out.length >= MAX_DISTINTOS) break;
  }
  return out;
}

export interface ProductoActual {
  id: string;
  nombre: string;
  precioCentavos: number;
  disponible: boolean;
}

/**
 * Sincroniza el carrito con el catálogo vigente: actualiza precios y retira
 * lo que ya no se vende. Devuelve mensajes para informar al cliente.
 */
export function sincronizarCarrito(
  items: readonly ItemCarrito[],
  actuales: readonly ProductoActual[],
): { items: ItemCarrito[]; cambios: string[] } {
  const porId = new Map(actuales.map((p) => [p.id, p]));
  const cambios: string[] = [];
  const out: ItemCarrito[] = [];
  for (const item of items) {
    const actual = porId.get(item.productoId);
    if (!actual || !actual.disponible) {
      cambios.push(`«${item.nombre}» ya no está disponible y se quitó del carrito.`);
      continue;
    }
    if (actual.precioCentavos !== item.precioCentavos) {
      cambios.push(`El precio de «${actual.nombre}» se actualizó.`);
    }
    out.push({ ...item, nombre: actual.nombre, precioCentavos: actual.precioCentavos });
  }
  return { items: out, cambios };
}
