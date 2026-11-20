import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnviarPorWhatsApp } from "@/components/tienda/enviar-whatsapp";
import { ButtonA, ButtonLink } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/feedback";
import { IconCheck, IconMapPin, IconWhatsApp, IconX } from "@/components/ui/icons";
import { convertir, formatearMoneda } from "@/domain/money";
import { normalizarCodigo } from "@/domain/order-code";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_METODO,
  ETIQUETA_PAGO,
  PASOS_SEGUIMIENTO,
  pasoActual,
} from "@/domain/order-status";
import { enlaceWhatsApp } from "@/domain/whatsapp";
import { cn, formatearFecha, formatearFechaHora, urlAbsoluta } from "@/lib/utils";
import { obtenerConfiguracion } from "@/server/repositories/catalogo";
import { obtenerSeguimiento } from "@/server/repositories/pedidos";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ nuevo?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;
  return {
    title: `Pedido ${decodeURIComponent(codigo).toUpperCase()}`,
    robots: { index: false },
  };
}

export default async function SeguimientoPage({ params, searchParams }: Props) {
  const [{ codigo: crudo }, { nuevo }] = await Promise.all([params, searchParams]);
  const codigo = normalizarCodigo(decodeURIComponent(crudo));
  if (!codigo) notFound();

  const [pedido, config] = await Promise.all([
    obtenerSeguimiento(codigo),
    obtenerConfiguracion().catch(() => null),
  ]);
  if (!pedido) notFound();

  const whatsappNegocio = config?.whatsappNegocio ?? "5355555555";
  const url = urlAbsoluta(`/seguimiento/${pedido.codigo}`);
  const paso = pasoActual(pedido.estado);
  const cancelado = pedido.estado === "cancelado";
  const totalCup = pedido.tasaCup ? convertir(pedido.total, "CUP", { CUP: pedido.tasaCup }) : null;
  const ultimoEvento = (estado: string) =>
    [...pedido.eventos].reverse().find((e) => e.estado === estado);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {nuevo && (
        <section className="space-y-4 rounded-2xl bg-green-50 p-5 ring-1 ring-green-200">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-600 text-white">
              <IconCheck />
            </span>
            <div>
              <h2 className="text-lg font-bold text-green-900">¡Recibimos su pedido!</h2>
              <p className="text-sm text-green-900">
                Guarde el código <strong>{pedido.codigo}</strong>. Para agilizarlo, envíenos el
                resumen por WhatsApp: le responderemos con{" "}
                {pedido.metodoPago === "enlace_pago"
                  ? "el enlace de pago"
                  : "la confirmación de la entrega"}
                .
              </p>
            </div>
          </div>
          <EnviarPorWhatsApp
            codigo={pedido.codigo}
            respaldo={enlaceWhatsApp(
              whatsappNegocio,
              `Hola, acabo de hacer el pedido ${pedido.codigo}. Seguimiento: ${url}`,
            )}
          />
        </section>
      )}

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Pedido del {formatearFecha(pedido.creadoEn)}</p>
          <h1 className="text-3xl font-extrabold tracking-wide text-slate-900">{pedido.codigo}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tono={cancelado ? "peligro" : pedido.estado === "entregado" ? "exito" : "marca"}>
            {ETIQUETA_ESTADO[pedido.estado]}
          </Badge>
          <Badge
            tono={
              pedido.estadoPago === "pagado"
                ? "exito"
                : pedido.estadoPago === "reembolsado"
                  ? "neutro"
                  : "aviso"
            }
          >
            {ETIQUETA_PAGO[pedido.estadoPago]}
          </Badge>
        </div>
      </header>

      <section aria-labelledby="estado" className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 id="estado" className="sr-only">
          Estado del pedido
        </h2>
        {cancelado ? (
          <Alert tono="peligro" titulo="Este pedido fue cancelado">
            Si tiene dudas, escríbanos por WhatsApp.
          </Alert>
        ) : (
          <>
            <p className="mb-5 flex items-center gap-2 text-sm text-slate-700">
              <IconMapPin size={18} className="text-brand-700 shrink-0" />
              <span>
                Para <strong>{pedido.destinatario}</strong> en {pedido.municipio}
                {pedido.diasMin !== null && pedido.estado !== "entregado" && (
                  <>
                    {" "}
                    · entrega estimada en {pedido.diasMin}–{pedido.diasMax} días
                  </>
                )}
              </span>
            </p>
            <ol className="relative space-y-5">
              {PASOS_SEGUIMIENTO.map((estado, i) => {
                const hecho = i <= paso;
                const actual = i === paso;
                // El paso inicial siempre tiene la fecha de creación del pedido.
                const fecha =
                  estado === "pendiente" ? pedido.creadoEn : ultimoEvento(estado)?.creadoEn;
                return (
                  <li key={estado} className="relative flex gap-4">
                    {i < PASOS_SEGUIMIENTO.length - 1 && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-8 left-[15px] h-[calc(100%-4px)] w-0.5",
                          i < paso ? "bg-green-500" : "bg-slate-200",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                        hecho ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500",
                        actual && "ring-4 ring-green-100",
                      )}
                    >
                      {hecho ? <IconCheck size={16} /> : i + 1}
                    </span>
                    <div className="pt-1">
                      <p
                        className={cn("font-semibold", hecho ? "text-slate-900" : "text-slate-400")}
                      >
                        {ETIQUETA_ESTADO[estado]}
                        {actual && <span className="sr-only"> (estado actual)</span>}
                      </p>
                      {fecha && hecho && (
                        <p className="text-xs text-slate-500">{formatearFechaHora(fecha)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      <section aria-labelledby="detalle" className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
        <h2 id="detalle" className="mb-3 font-bold text-slate-900">
          Detalle
        </h2>
        <ul className="space-y-2 text-sm">
          {pedido.items.map((i) => (
            <li key={i.nombre} className="flex justify-between gap-3">
              <span className="text-slate-700">
                {i.cantidad} × {i.nombre}
                {i.tipo === "combo" && (
                  <Badge tono="marca" className="ml-2">
                    Combo
                  </Badge>
                )}
              </span>
              <span className="tabular-nums">
                {formatearMoneda(i.precioCentavos * i.cantidad, "USD")}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="tabular-nums">{formatearMoneda(pedido.subtotal, "USD")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Envío a {pedido.municipio}</dt>
            <dd className="tabular-nums">{formatearMoneda(pedido.envio, "USD")}</dd>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <dt>Total</dt>
            <dd className="text-right tabular-nums">
              {formatearMoneda(pedido.total, "USD")}
              {totalCup !== null && (
                <span className="block text-xs font-normal text-slate-500">
                  ≈ {formatearMoneda(totalCup, "CUP")} (tasa del día del pedido)
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Forma de pago</dt>
            <dd>{ETIQUETA_METODO[pedido.metodoPago]}</dd>
          </div>
        </dl>
      </section>

      {pedido.eventos.some((e) => e.estado === null) && (
        <section className="rounded-2xl bg-white p-5 text-sm ring-1 ring-slate-200">
          <h2 className="mb-2 font-bold text-slate-900">Historial</h2>
          <ul className="space-y-1.5">
            {pedido.eventos.map((e, i) => (
              <li key={i} className="flex justify-between gap-3 text-slate-700">
                <span className="inline-flex items-center gap-1.5">
                  {e.estado === "cancelado" ? (
                    <IconX size={14} className="text-danger-600" />
                  ) : (
                    <IconCheck size={14} className="text-green-600" />
                  )}
                  {e.nota}
                </span>
                <span className="text-xs whitespace-nowrap text-slate-500">
                  {formatearFechaHora(e.creadoEn)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonA
          variante="secundario"
          href={enlaceWhatsApp(
            whatsappNegocio,
            `Hola, tengo una consulta sobre mi pedido ${pedido.codigo}.`,
          )}
        >
          <IconWhatsApp /> Consultar por WhatsApp
        </ButtonA>
        <ButtonLink href="/productos" variante="fantasma">
          Seguir comprando
        </ButtonLink>
      </div>
      <p className="text-xs text-slate-500">
        Por privacidad solo mostramos el primer nombre de quien recibe.{" "}
        <Link href="/seguimiento" className="underline">
          Buscar otro pedido
        </Link>
      </p>
    </div>
  );
}
