import "server-only";
import type { Pedido } from "@/domain/schemas";
import { mensajeNuevoPedido, enlaceWhatsApp } from "@/domain/whatsapp";
import { urlAbsoluta } from "@/lib/utils";
import { obtenerConfiguracion } from "../repositories/catalogo";
import { ErrorPedido, insertarPedido, obtenerSeguimiento } from "../repositories/pedidos";

/**
 * Traduce los errores de negocio de crear_pedido() (prefijo antes de ":") a
 * mensajes para el cliente. Nunca se muestran mensajes técnicos.
 */
export function mensajeDeError(e: unknown): string {
  if (!(e instanceof ErrorPedido)) {
    return "No pudimos registrar el pedido. Revise su conexión e intente de nuevo.";
  }
  const [prefijo, ...resto] = e.message.split(":");
  const detalle = resto.join(":").trim();
  switch (prefijo) {
    case "SIN_STOCK":
      return `No quedan suficientes unidades de «${detalle}». Reduzca la cantidad o elija otro producto.`;
    case "PRODUCTO_NO_DISPONIBLE":
      return "Un producto de su carrito ya no está disponible. Vuelva al carrito para actualizarlo.";
    case "ZONA_NO_DISPONIBLE":
      return "Por ahora no entregamos en ese municipio. Elija otro o escríbanos por WhatsApp.";
    case "DEMASIADOS_PEDIDOS":
      return "Ha hecho varios pedidos seguidos. Espere unos minutos o escríbanos por WhatsApp.";
    case "CARRITO_VACIO":
      return "Su carrito está vacío.";
    case "CANTIDAD_INVALIDA":
    case "DEMASIADOS_PRODUCTOS":
      return detalle || "Revise las cantidades del carrito.";
    default:
      return e.codigoSql === "23514"
        ? "Algún dato no tiene el formato correcto. Revise el formulario."
        : "No pudimos registrar el pedido. Intente de nuevo en unos segundos.";
  }
}

export type ResultadoPedido =
  | { ok: true; codigo: string; whatsapp: string }
  | { ok: false; mensaje: string; errores?: Record<string, string> };

/** Caso de uso: crear el pedido y preparar el mensaje de WhatsApp para el negocio. */
export async function crearPedido(pedido: Pedido): Promise<ResultadoPedido> {
  let codigo: string;
  try {
    ({ codigo } = await insertarPedido(pedido));
  } catch (e) {
    return { ok: false, mensaje: mensajeDeError(e) };
  }

  const urlSeguimiento = urlAbsoluta(`/seguimiento/${codigo}`);
  const [seguimiento, config] = await Promise.all([
    obtenerSeguimiento(codigo).catch(() => null),
    obtenerConfiguracion().catch(() => null),
  ]);
  const telefono = config?.whatsappNegocio ?? "5355555555";

  const texto = seguimiento
    ? mensajeNuevoPedido({
        codigo,
        compradorNombre: pedido.comprador.nombre,
        compradorPais: pedido.comprador.pais,
        destNombre: pedido.destinatario.nombre,
        municipio: seguimiento.municipio,
        items: seguimiento.items,
        subtotal: seguimiento.subtotal,
        envio: seguimiento.envio,
        total: seguimiento.total,
        metodoPago: pedido.metodo_pago,
        urlSeguimiento,
        tasas: seguimiento.tasaCup ? { CUP: seguimiento.tasaCup } : undefined,
      })
    : `Hola, acabo de hacer el pedido ${codigo}. Seguimiento: ${urlSeguimiento}`;

  return { ok: true, codigo, whatsapp: enlaceWhatsApp(telefono, texto) };
}
