import { Badge } from "@/components/ui/feedback";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_PAGO,
  type EstadoPago,
  type EstadoPedido,
} from "@/domain/order-status";

const TONO_ESTADO = {
  pendiente: "aviso",
  confirmado: "info",
  en_preparacion: "marca",
  en_camino: "marca",
  entregado: "exito",
  cancelado: "peligro",
} as const satisfies Record<EstadoPedido, string>;

const TONO_PAGO = {
  pendiente: "aviso",
  pagado: "exito",
  reembolsado: "neutro",
} as const satisfies Record<EstadoPago, string>;

export function BadgeEstado({ estado }: { estado: EstadoPedido }) {
  return <Badge tono={TONO_ESTADO[estado]}>{ETIQUETA_ESTADO[estado]}</Badge>;
}

export function BadgePago({ estado }: { estado: EstadoPago }) {
  return <Badge tono={TONO_PAGO[estado]}>{ETIQUETA_PAGO[estado]}</Badge>;
}
