import type { Tasas } from "@/domain/money";
import type { EstadoPago, EstadoPedido, MetodoPago } from "@/domain/order-status";

export type TipoProducto = "producto" | "combo";

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  icono: string | null;
  orden: number;
}

export interface Producto {
  id: string;
  categoriaId: string;
  categoria: { nombre: string; slug: string } | null;
  tipo: TipoProducto;
  nombre: string;
  slug: string;
  descripcion: string;
  precioCentavos: number;
  unidad: string | null;
  /** Ruta tal como está en la BD (relativa o URL de Storage). */
  imagenRuta: string | null;
  /** URL lista para <Image>. */
  imagen: string | null;
  stock: number | null;
  activo: boolean;
  destacado: boolean;
}

export interface ComboItem {
  producto: Producto;
  cantidad: number;
}

export interface ProductoDetalle extends Producto {
  items: ComboItem[];
}

export interface Zona {
  id: string;
  municipio: string;
  costoCentavos: number;
  diasMin: number;
  diasMax: number;
  activa: boolean;
}

export interface Banner {
  id: string;
  titulo: string;
  subtitulo: string | null;
  imagen: string | null;
  enlace: string | null;
  orden: number;
  activo: boolean;
}

export interface Configuracion {
  nombreNegocio: string;
  whatsappNegocio: string;
  emailContacto: string | null;
  horario: string | null;
}

export type { Tasas };

export interface Seguimiento {
  codigo: string;
  estado: EstadoPedido;
  estadoPago: EstadoPago;
  metodoPago: MetodoPago;
  creadoEn: string;
  destinatario: string;
  municipio: string;
  diasMin: number | null;
  diasMax: number | null;
  subtotal: number;
  envio: number;
  total: number;
  tasaCup: number | null;
  tasaEur: number | null;
  items: { nombre: string; tipo: TipoProducto; cantidad: number; precioCentavos: number }[];
  eventos: { estado: EstadoPedido | null; nota: string; creadoEn: string }[];
}
