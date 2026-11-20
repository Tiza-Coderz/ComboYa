import { z } from "zod";
import { METODOS_PAGO } from "./order-status";
import { limpiarTelefono, normalizarTelefonoCuba } from "./phone";

// ─── Piezas reutilizables ───────────────────────────────────────────────────

/** Texto opcional de formulario: "" se convierte en undefined. */
const textoOpcional = (max: number, mensaje?: string) =>
  z
    .string()
    .trim()
    .max(max, mensaje ?? `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Casilla de formulario HTML ("on") o booleano. */
const casilla = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

const telefonoInternacional = z
  .string()
  .transform((v) => limpiarTelefono(v))
  .pipe(z.string().regex(/^\+?\d{7,15}$/, "Escriba el teléfono con el código de país"));

const telefonoCuba = z.string().transform((v, ctx) => {
  const n = normalizarTelefonoCuba(v);
  if (!n) {
    ctx.addIssue({ code: "custom", message: "Teléfono cubano de 8 dígitos (ej. 5234 5678)" });
    return z.NEVER;
  }
  return n;
});

/** Carné de identidad cubano: 11 dígitos, los 6 primeros son la fecha AAMMDD. */
export function esCarneValido(carne: string): boolean {
  if (!/^\d{11}$/.test(carne)) return false;
  const mes = Number(carne.slice(2, 4));
  const dia = Number(carne.slice(4, 6));
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31;
}

const precio = z.coerce
  .number({ error: "Escriba un precio" })
  .min(0, "El precio no puede ser negativo")
  .max(99_999, "Precio demasiado alto")
  .transform((v) => Math.round(v * 100) / 100);

const entero = (min: number, max: number) =>
  z.coerce.number().int("Debe ser un número entero").min(min).max(max);

const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones");

// ─── Checkout ───────────────────────────────────────────────────────────────

export const compradorSchema = z.object({
  nombre: z.string().trim().min(2, "Escriba su nombre completo").max(120),
  pais: z.string().trim().min(2, "Indique el país donde vive").max(60),
  telefono: telefonoInternacional,
  email: z.string().trim().toLowerCase().pipe(z.email("Correo electrónico no válido")),
});

export const destinatarioSchema = z.object({
  nombre: z.string().trim().min(2, "Escriba el nombre de quien recibe").max(120),
  carne: textoOpcional(11).refine((v) => v === undefined || esCarneValido(v), {
    message: "El carné tiene 11 dígitos",
  }),
  telefono: telefonoCuba,
  zona_id: z.uuid("Elija el municipio de entrega"),
  direccion: z
    .string()
    .trim()
    .min(5, "Escriba la dirección completa (calle, número, entre calles)")
    .max(300),
  referencia: textoOpcional(200),
  mensaje: textoOpcional(500, "El mensaje admite hasta 500 caracteres"),
});

export const itemPedidoSchema = z.object({
  producto_id: z.uuid(),
  cantidad: z.number().int().min(1).max(50),
});

export const pedidoSchema = z.object({
  comprador: compradorSchema,
  destinatario: destinatarioSchema,
  metodo_pago: z.enum(METODOS_PAGO, { error: "Elija cómo desea pagar" }),
  items: z
    .array(itemPedidoSchema)
    .min(1, "Su carrito está vacío")
    .max(30, "Máximo 30 productos distintos por pedido"),
});

export type CompradorInput = z.input<typeof compradorSchema>;
export type DestinatarioInput = z.input<typeof destinatarioSchema>;
export type PedidoInput = z.input<typeof pedidoSchema>;
export type Pedido = z.output<typeof pedidoSchema>;

// ─── Administración ─────────────────────────────────────────────────────────

export const productoSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  slug,
  categoria_id: z.uuid("Elija una categoría"),
  descripcion: z.string().trim().max(1000).default(""),
  precio_usd: precio,
  unidad: textoOpcional(60),
  stock: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    entero(0, 100_000).nullable(),
  ),
  activo: casilla,
  destacado: casilla,
  imagen_url: textoOpcional(500),
});
export type ProductoForm = z.output<typeof productoSchema>;

export const comboItemsSchema = z
  .array(z.object({ producto_id: z.uuid(), cantidad: entero(1, 99) }))
  .min(1, "Un combo debe incluir al menos un producto")
  .max(40)
  .refine((items) => new Set(items.map((i) => i.producto_id)).size === items.length, {
    message: "Hay productos repetidos en el combo",
  });

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2).max(60),
  slug,
  icono: textoOpcional(30),
  orden: entero(0, 999),
});

export const zonaSchema = z
  .object({
    municipio: z.string().trim().min(2).max(80),
    costo_usd: precio,
    dias_min: entero(0, 30),
    dias_max: entero(0, 30),
    activa: casilla,
  })
  .refine((z) => z.dias_max >= z.dias_min, {
    message: "Los días máximos no pueden ser menos que los mínimos",
    path: ["dias_max"],
  });

export const tasaSchema = z.object({
  moneda: z.enum(["CUP", "EUR"]),
  tasa: z.coerce
    .number({ error: "Escriba la tasa" })
    .positive("La tasa debe ser mayor que 0")
    .max(100_000, "Tasa fuera de rango"),
});

export const configuracionSchema = z.object({
  nombre_negocio: z.string().trim().min(2).max(60),
  whatsapp_negocio: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{8,15}$/, "Número con código de país, solo dígitos")),
  email_contacto: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(z.email("Correo no válido").optional()),
  horario: textoOpcional(120),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Correo no válido")),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

/** Primer mensaje de error de cada campo, con la ruta unida por puntos. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const clave = issue.path.join(".");
    if (!(clave in out)) out[clave] = issue.message;
  }
  return out;
}
