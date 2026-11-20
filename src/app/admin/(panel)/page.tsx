import type { Metadata } from "next";
import Link from "next/link";
import { BadgeEstado, BadgePago } from "@/components/admin/estado";
import { BarrasHorizontales, GraficoVentasDia } from "@/components/admin/graficos";
import { Encabezado, StatCard, Tarjeta } from "@/components/admin/ui";
import { IconAlert, IconChart, IconList, IconTag } from "@/components/ui/icons";
import { resumirPedidos } from "@/domain/dashboard";
import { convertir, formatearMoneda } from "@/domain/money";
import { cn, formatearFechaHora, plural } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { listarPedidos, pedidosParaDashboard } from "@/server/repositories/admin-pedidos";
import { obtenerTasas } from "@/server/repositories/catalogo";

export const metadata: Metadata = { title: "Resumen" };

const PERIODOS = [7, 30] as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const dias = (await searchParams).dias === "7" ? 7 : 30;
  const [pedidos, recientes, tasas] = await Promise.all([
    pedidosParaDashboard(supabase, dias),
    listarPedidos(supabase, { pagina: 1 }),
    obtenerTasas().catch(() => ({})),
  ]);
  const r = resumirPedidos(pedidos, { dias, top: 5 });
  const ventasCup = convertir(r.ventas, "CUP", tasas);

  return (
    <>
      <Encabezado
        titulo="Resumen"
        descripcion="Ventas sin contar pedidos cancelados. Fechas en hora de La Habana."
        acciones={
          <div
            role="group"
            aria-label="Periodo"
            className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200"
          >
            {PERIODOS.map((p) => (
              <Link
                key={p}
                href={`/admin?dias=${p}`}
                aria-current={dias === p ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium",
                  dias === p ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {p} días
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo={`Ventas (${dias} días)`}
          valor={formatearMoneda(r.ventas, "USD")}
          detalle={ventasCup !== null ? `≈ ${formatearMoneda(ventasCup, "CUP")}` : undefined}
          icono={<IconChart />}
        />
        <StatCard
          titulo="Pedidos"
          valor={r.pedidos}
          detalle={`Ticket medio ${formatearMoneda(r.ticketMedio, "USD")}`}
          icono={<IconList />}
        />
        <StatCard
          titulo="Por cobrar"
          valor={formatearMoneda(r.porCobrar, "USD")}
          detalle="Pedidos activos con pago pendiente"
          icono={<IconTag />}
        />
        <StatCard
          titulo="Pendientes de confirmar"
          valor={r.pendientes}
          detalle={
            r.pendientes > 0 ? (
              <Link
                href="/admin/pedidos?estado=pendiente"
                className="text-brand-700 font-semibold hover:underline"
              >
                Atenderlos ahora →
              </Link>
            ) : (
              "Todo al día"
            )
          }
          icono={<IconAlert />}
        />
      </div>

      <Tarjeta>
        <h2 className="mb-4 font-semibold text-slate-900">Ventas por día (USD)</h2>
        <GraficoVentasDia datos={r.ventasPorDia} />
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-4 font-semibold text-slate-900">Productos más vendidos</h2>
          <BarrasHorizontales
            titulo="Productos más vendidos"
            datos={r.topProductos.map((p) => ({
              etiqueta: p.nombre,
              valor: p.unidades,
              detalle: `${plural(p.unidades, "ud.", "uds.")} · ${formatearMoneda(p.ingresos, "USD")}`,
            }))}
          />
        </Tarjeta>
        <Tarjeta>
          <h2 className="mb-4 font-semibold text-slate-900">Pedidos por municipio</h2>
          <BarrasHorizontales
            titulo="Pedidos por municipio"
            datos={r.porMunicipio.slice(0, 8).map((m) => ({
              etiqueta: m.municipio,
              valor: m.pedidos,
              detalle: `${plural(m.pedidos, "pedido")} · ${formatearMoneda(m.total, "USD")}`,
            }))}
          />
        </Tarjeta>
      </div>

      <Tarjeta>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Últimos pedidos</h2>
          <Link
            href="/admin/pedidos"
            className="text-brand-700 text-sm font-semibold hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        <ul className="divide-y divide-slate-100">
          {recientes.pedidos.slice(0, 6).map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/pedidos/${p.id}`}
                className="-mx-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-2.5 hover:bg-slate-50"
              >
                <span className="text-brand-700 w-20 font-mono font-semibold">{p.codigo}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {p.compradorNombre} → {p.destNombre.split(" ")[0]}, {p.municipio}
                </span>
                <span className="text-xs text-slate-500">{formatearFechaHora(p.creadoEn)}</span>
                <span className="w-20 text-right text-sm font-semibold tabular-nums">
                  {formatearMoneda(p.total, "USD")}
                </span>
                <span className="flex gap-1">
                  <BadgeEstado estado={p.estado} />
                  <BadgePago estado={p.estadoPago} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </>
  );
}
