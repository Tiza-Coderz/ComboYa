import type { ProductoCarrito } from "@/domain/cart";
import type { Producto } from "@/server/types";

/** Datos mínimos del producto que se guardan en el carrito del navegador. */
export function paraCarrito(p: Producto): ProductoCarrito {
  return {
    productoId: p.id,
    slug: p.slug,
    nombre: p.nombre,
    tipo: p.tipo,
    precioCentavos: p.precioCentavos,
    imagen: p.imagen,
    unidad: p.unidad,
  };
}
