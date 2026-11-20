import { convertir, formatearMoneda, type Tasas } from "./money";
import { ETIQUETA_ESTADO, ETIQUETA_METODO, type EstadoPedido, type MetodoPago } from "./order-status";
import { telefonoParaWhatsApp } from "./phone";

/** Enlace wa.me con el mensaje ya escrito. */
export function enlaceWhatsApp(telefono: string, texto: string): string {
  return `https://wa.me/${telefonoParaWhatsApp(telefono)}?text=${encodeURIComponent(texto)}`;
}

export interface ResumenPedidoWhatsApp {
  codigo: string;
  compradorNombre: string;
  compradorPais: string;
  destNombre: string;
  municipio: string;
  items: readonly { nombre: string; cantidad: number; precioCentavos: number }[];
  subtotal: number;
  envio: number;
  total: number;
  metodoPago: MetodoPago;
  urlSeguimiento: string;
  tasas?: Tasas;
}

/** Mensaje que el comprador envía al negocio al confirmar el pedido. */
export function mensajeNuevoPedido(r: ResumenPedidoWhatsApp): string {
  const lineas = r.items.map(
    (i) => `• ${i.cantidad} × ${i.nombre} — ${formatearMoneda(i.precioCentavos * i.cantidad, "USD")}`,
  );
  const cup = r.tasas ? convertir(r.total, "CUP", r.tasas) : null;
  return [
    `Hola, acabo de hacer el pedido *${r.codigo}* en la tienda.`,
    "",
    ...lineas,
    "",
    `Subtotal: ${formatearMoneda(r.subtotal, "USD")}`,
    `Envío a ${r.municipio}: ${formatearMoneda(r.envio, "USD")}`,
    `*Total: ${formatearMoneda(r.total, "USD")}*` + (cup !== null ? ` (≈ ${formatearMoneda(cup, "CUP")})` : ""),
    "",
    `Pago: ${ETIQUETA_METODO[r.metodoPago]}`,
    `Compra: ${r.compradorNombre} (${r.compradorPais})`,
    `Recibe: ${r.destNombre}, ${r.municipio}`,
    "",
    `Seguimiento: ${r.urlSeguimiento}`,
  ].join("\n");
}

/** Aviso del negocio al destinatario en Cuba. */
export function mensajeAvisoDestinatario(p: {
  destNombre: string;
  compradorNombre: string;
  codigo: string;
  estado: EstadoPedido;
  nombreNegocio: string;
  urlSeguimiento: string;
}): string {
  const nombre = p.destNombre.split(" ")[0] ?? p.destNombre;
  const familiar = p.compradorNombre.split(" ")[0] ?? p.compradorNombre;
  const detalle: Partial<Record<EstadoPedido, string>> = {
    confirmado: "Ya lo estamos preparando y le avisaremos antes de salir.",
    en_preparacion: "Lo estamos preparando ahora mismo.",
    en_camino: "Va en camino. Por favor, esté pendiente del teléfono.",
    entregado: "Fue entregado. ¡Que lo disfruten!",
  };
  return [
    `Hola, ${nombre}. Le escribimos de ${p.nombreNegocio}.`,
    `${familiar} le envió un pedido (*${p.codigo}*). Estado: *${ETIQUETA_ESTADO[p.estado]}*.`,
    detalle[p.estado] ?? "",
    `Puede seguirlo aquí: ${p.urlSeguimiento}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Mensaje del negocio al comprador (cobro o dudas). */
export function mensajeContactoComprador(p: {
  compradorNombre: string;
  codigo: string;
  nombreNegocio: string;
  total: number;
  metodoPago: MetodoPago;
}): string {
  const nombre = p.compradorNombre.split(" ")[0] ?? p.compradorNombre;
  const cobro =
    p.metodoPago === "enlace_pago"
      ? `Le enviamos el enlace de pago por ${formatearMoneda(p.total, "USD")} (TropiPay o Zelle).`
      : `El pago de ${formatearMoneda(p.total, "USD")} se hará en efectivo al entregar.`;
  return `Hola, ${nombre}. Le escribimos de ${p.nombreNegocio} sobre su pedido *${p.codigo}*. ${cobro}`;
}

export function mensajeCompartirProducto(p: { nombre: string; precioCentavos: number; url: string }) {
  return `Mira este ${p.nombre} por ${formatearMoneda(p.precioCentavos, "USD")} con entrega en La Habana: ${p.url}`;
}
