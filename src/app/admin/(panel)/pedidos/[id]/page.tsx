import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeEstado, BadgePago } from "@/components/admin/estado";
import { Tarjeta } from "@/components/admin/ui";
import { Button, ButtonA, ButtonLink } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/feedback";
import { Textarea } from "@/components/ui/field";
import { IconChevronLeft, IconPrinter, IconWhatsApp } from "@/components/ui/icons";
import { convertir, formatearMoneda } from "@/domain/money";
import { ETIQUETA_ESTADO, ETIQUETA_METODO, siguientesEstados } from "@/domain/order-status";
import { formatearTelefonoCuba } from "@/domain/phone";
import {
  enlaceWhatsApp,
  mensajeAvisoDestinatario,
  mensajeContactoComprador,
} from "@/domain/whatsapp";
import { formatearFechaHora, urlAbsoluta } from "@/lib/utils";
import {
  agregarEventoPedido,
  cambiarEstadoPedido,
  cambiarPagoPedido,
  guardarNotasPedido,
} from "@/server/actions/admin-pedidos";
import { requireAdmin } from "@/server/auth";
import { obtenerPedidoAdmin } from "@/server/repositories/admin-pedidos";
import { obtenerConfiguracion } from "@/server/repositories/catalogo";

export const metadata: Metadata = { title: "Detalle del pedido" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
};

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

export default async function PedidoAdminPage({ params, searchParams }: Props) {
  const [{ id }, { ok, error }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [pedido, config] = await Promise.all([
    obtenerPedidoAdmin(supabase, id),
    obtenerConfiguracion().catch(() => null),
  ]);
  if (!pedido) notFound();

  const negocio = config?.nombreNegocio ?? "ComboYa";
  const urlSeguimiento = urlAbsoluta(`/seguimiento/${pedido.codigo}`);
  const siguientes = siguientesEstados(pedido.estado);
  const totalCup = pedido.tasaCup ? convertir(pedido.total, "CUP", { CUP: pedido.tasaCup }) : null;

  const waDestinatario = enlaceWhatsApp(
    pedido.destTelefono,
    mensajeAvisoDestinatario({
      destNombre: pedido.destNombre,
      compradorNombre: pedido.compradorNombre,
      codigo: pedido.codigo,
      estado: pedido.estado,
      nombreNegocio: negocio,
      urlSeguimiento,
    }),
  );
  const waComprador = enlaceWhatsApp(
    pedido.compradorTelefono,
    mensajeContactoComprador({
      compradorNombre: pedido.compradorNombre,
      codigo: pedido.codigo,
      nombreNegocio: negocio,
      total: pedido.total,
      metodoPago: pedido.metodoPago,
    }),
  );

  return (
    <>
      <div className="space-y-3">
        <Link
          href="/admin/pedidos"
          className="text-brand-700 inline-flex items-center gap-1 text-sm font-medium"
        >
          <IconChevronLeft size={16} /> Pedidos
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-mono text-3xl font-bold text-slate-900">{pedido.codigo}</h1>
            <p className="text-sm text-slate-500">
              {formatearFechaHora(pedido.creadoEn)} · {ETIQUETA_METODO[pedido.metodoPago]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BadgeEstado estado={pedido.estado} />
            <BadgePago estado={pedido.estadoPago} />
          </div>
        </div>
      </div>

      {ok && <Alert tono="exito">{ok}</Alert>}
      {error && <Alert tono="peligro">{error}</Alert>}

      <Tarjeta className="space-y-4">
        <h2 className="font-semibold text-slate-900">Acciones</h2>
        <div className="flex flex-wrap gap-2">
          {siguientes.map((e) => (
            <form key={e} action={cambiarEstadoPedido}>
              <input type="hidden" name="id" value={pedido.id} />
              <input type="hidden" name="estado" value={e} />
              <Button
                type="submit"
                variante={e === "cancelado" ? "secundario" : "primario"}
                tamano="sm"
              >
                {e === "cancelado" ? "Cancelar pedido" : `Marcar «${ETIQUETA_ESTADO[e]}»`}
              </Button>
            </form>
          ))}
          {pedido.estadoPago === "pendiente" && pedido.estado !== "cancelado" && (
            <form action={cambiarPagoPedido}>
              <input type="hidden" name="id" value={pedido.id} />
              <input type="hidden" name="estado_pago" value="pagado" />
              <Button type="submit" tamano="sm" className="bg-green-700 hover:bg-green-800">
                Marcar como pagado
              </Button>
            </form>
          )}
          {pedido.estadoPago === "pagado" && (
            <>
              <form action={cambiarPagoPedido}>
                <input type="hidden" name="id" value={pedido.id} />
                <input type="hidden" name="estado_pago" value="pendiente" />
                <Button type="submit" variante="fantasma" tamano="sm">
                  Deshacer pago
                </Button>
              </form>
              {pedido.estado === "cancelado" && (
                <form action={cambiarPagoPedido}>
                  <input type="hidden" name="id" value={pedido.id} />
                  <input type="hidden" name="estado_pago" value="reembolsado" />
                  <Button type="submit" variante="secundario" tamano="sm">
                    Registrar reembolso
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <ButtonA href={waDestinatario} variante="whatsapp" tamano="sm">
            <IconWhatsApp size={16} /> Avisar al destinatario
          </ButtonA>
          <ButtonA href={waComprador} variante="secundario" tamano="sm">
            <IconWhatsApp size={16} /> Escribir al comprador
          </ButtonA>
          <ButtonLink
            href={`/admin/imprimir/${pedido.id}`}
            variante="secundario"
            tamano="sm"
            target="_blank"
          >
            <IconPrinter size={16} /> Hoja de entrega
          </ButtonLink>
        </div>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-3 font-semibold text-slate-900">Comprador (exterior)</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Nombre">{pedido.compradorNombre}</Dato>
            <Dato etiqueta="País">{pedido.compradorPais}</Dato>
            <Dato etiqueta="Teléfono">
              <a
                href={`tel:${pedido.compradorTelefono}`}
                className="text-brand-700 hover:underline"
              >
                {pedido.compradorTelefono}
              </a>
            </Dato>
            <Dato etiqueta="Correo">
              <a
                href={`mailto:${pedido.compradorEmail}`}
                className="text-brand-700 break-all hover:underline"
              >
                {pedido.compradorEmail}
              </a>
            </Dato>
          </dl>
        </Tarjeta>
        <Tarjeta>
          <h2 className="mb-3 font-semibold text-slate-900">Destinatario (La Habana)</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Nombre">{pedido.destNombre}</Dato>
            <Dato etiqueta="Carné">{pedido.destCarne ?? "—"}</Dato>
            <Dato etiqueta="Teléfono">
              <a href={`tel:+53${pedido.destTelefono}`} className="text-brand-700 hover:underline">
                {formatearTelefonoCuba(pedido.destTelefono)}
              </a>
            </Dato>
            <Dato etiqueta="Municipio">{pedido.municipio}</Dato>
            <Dato etiqueta="Dirección">{pedido.direccion}</Dato>
            <Dato etiqueta="Referencia">{pedido.referencia ?? "—"}</Dato>
          </dl>
          {pedido.mensajeFamilia && (
            <blockquote className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 italic ring-1 ring-amber-200">
              “{pedido.mensajeFamilia}”
            </blockquote>
          )}
        </Tarjeta>
      </div>

      <Tarjeta>
        <h2 className="mb-3 font-semibold text-slate-900">Productos</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {pedido.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>
                <strong>{i.cantidad} ×</strong> {i.nombre}
                {i.tipo === "combo" && (
                  <Badge tono="marca" className="ml-2">
                    Combo
                  </Badge>
                )}
              </span>
              <span className="tabular-nums">
                {formatearMoneda(i.precioCentavos, "USD")} c/u ·{" "}
                <strong>{formatearMoneda(i.precioCentavos * i.cantidad, "USD")}</strong>
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 ml-auto max-w-xs space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd className="tabular-nums">{formatearMoneda(pedido.subtotal, "USD")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Envío</dt>
            <dd className="tabular-nums">{formatearMoneda(pedido.envio, "USD")}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatearMoneda(pedido.total, "USD")}</dd>
          </div>
          {totalCup !== null && (
            <div className="flex justify-between text-xs text-slate-500">
              <dt>Tasa {pedido.tasaCup} CUP</dt>
              <dd className="tabular-nums">≈ {formatearMoneda(totalCup, "CUP")}</dd>
            </div>
          )}
        </dl>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta className="space-y-3">
          <h2 className="font-semibold text-slate-900">Notas internas</h2>
          <form action={guardarNotasPedido} className="space-y-2">
            <input type="hidden" name="id" value={pedido.id} />
            <label htmlFor="notas" className="sr-only">
              Notas internas
            </label>
            <Textarea
              id="notas"
              name="notas"
              rows={4}
              defaultValue={pedido.notasInternas ?? ""}
              placeholder="Solo las ve el equipo. Ej.: llamar antes de las 10 a. m."
            />
            <Button type="submit" variante="secundario" tamano="sm">
              Guardar notas
            </Button>
          </form>
        </Tarjeta>
        <Tarjeta className="space-y-3">
          <h2 className="font-semibold text-slate-900">Historial</h2>
          <ol className="space-y-2 text-sm">
            {pedido.eventos.map((e) => (
              <li key={e.id} className="flex justify-between gap-3">
                <span className="text-slate-800">{e.nota}</span>
                <span className="text-xs whitespace-nowrap text-slate-500">
                  {formatearFechaHora(e.creadoEn)}
                </span>
              </li>
            ))}
          </ol>
          <form action={agregarEventoPedido} className="flex gap-2 border-t border-slate-100 pt-3">
            <input type="hidden" name="id" value={pedido.id} />
            <label htmlFor="nota" className="sr-only">
              Nota visible para el cliente
            </label>
            <input
              id="nota"
              name="nota"
              placeholder="Nota visible en el seguimiento"
              className="focus:ring-brand-500 h-9 flex-1 rounded-xl border-0 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:outline-none"
            />
            <Button type="submit" tamano="sm">
              Añadir
            </Button>
          </form>
        </Tarjeta>
      </div>
    </>
  );
}
