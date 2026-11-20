import type { Metadata } from "next";
import Link from "next/link";
import { BadgeEstado, BadgePago } from "@/components/admin/estado";
import { Encabezado, Tabla } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Select } from "@/components/ui/field";
import { IconChevronLeft, IconChevronRight, IconList } from "@/components/ui/icons";
import { formatearMoneda } from "@/domain/money";
import {
  ESTADOS_PAGO,
  ESTADOS_PEDIDO,
  ETIQUETA_ESTADO,
  ETIQUETA_PAGO,
} from "@/domain/order-status";
import { cn, formatearFechaHora } from "@/lib/utils";
import {
  contarPorEstado,
  leerFiltrosPedidos,
  listarPedidos,
  type FiltrosPedidos,
} from "@/server/repositories/admin-pedidos";
import { listarZonas } from "@/server/repositories/catalogo";
import { requireAdmin } from "@/server/auth";

export const metadata: Metadata = { title: "Pedidos" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function href(f: FiltrosPedidos, cambios: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  const base: Record<string, string | undefined> = {
    estado: f.estado,
    pago: f.pago,
    municipio: f.municipio,
    q: f.q,
    ...cambios,
  };
  for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
  return `/admin/pedidos${p.size ? `?${p}` : ""}`;
}

export default async function PedidosAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdmin();
  const f = leerFiltrosPedidos(await searchParams);
  const [{ pedidos, total, paginas }, conteo, zonas] = await Promise.all([
    listarPedidos(supabase, f),
    contarPorEstado(supabase),
    listarZonas().catch(() => []),
  ]);
  const pagina = f.pagina ?? 1;

  return (
    <>
      <Encabezado titulo="Pedidos" descripcion={`${total} pedidos con los filtros actuales`} />

      <nav aria-label="Filtrar por estado" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {[undefined, ...ESTADOS_PEDIDO].map((e) => {
            const activo = f.estado === e;
            const n = e ? (conteo[e] ?? 0) : Object.values(conteo).reduce((a, b) => a + b, 0);
            return (
              <li key={e ?? "todos"}>
                <Link
                  href={href(f, { estado: e })}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap ring-1",
                    activo
                      ? "bg-brand-700 ring-brand-700 text-white"
                      : "bg-white text-slate-700 ring-slate-200",
                  )}
                >
                  {e ? ETIQUETA_ESTADO[e] : "Todos"}
                  <span className={cn("text-xs", activo ? "text-brand-100" : "text-slate-400")}>
                    {n}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        {f.estado && <input type="hidden" name="estado" value={f.estado} />}
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-700">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={f.q}
            placeholder="Código, comprador o destinatario"
            className="focus:ring-brand-500 block h-10 w-full rounded-xl border-0 px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="pago" className="mb-1 block text-xs font-medium text-slate-700">
            Pago
          </label>
          <Select id="pago" name="pago" defaultValue={f.pago ?? ""} className="h-10 py-0 text-sm">
            <option value="">Todos</option>
            {ESTADOS_PAGO.map((p) => (
              <option key={p} value={p}>
                {ETIQUETA_PAGO[p]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="municipio" className="mb-1 block text-xs font-medium text-slate-700">
            Municipio
          </label>
          <Select
            id="municipio"
            name="municipio"
            defaultValue={f.municipio ?? ""}
            className="h-10 py-0 text-sm"
          >
            <option value="">Todos</option>
            {zonas.map((z) => (
              <option key={z.id} value={z.municipio}>
                {z.municipio}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-brand-700 hover:bg-brand-800 h-10 rounded-xl px-4 text-sm font-semibold text-white"
          >
            Filtrar
          </button>
          <Link
            href="/admin/pedidos"
            className="grid h-10 place-items-center rounded-xl px-3 text-sm text-slate-600 hover:bg-slate-100"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {pedidos.length === 0 ? (
        <EmptyState icono={<IconList />} titulo="No hay pedidos con estos filtros" />
      ) : (
        <Tabla>
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th>Comprador</th>
              <th>Destinatario</th>
              <th className="text-right">Total</th>
              <th>Estado</th>
              <th>Pago</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td>
                  <Link
                    href={`/admin/pedidos/${p.id}`}
                    className="text-brand-700 font-mono font-semibold hover:underline"
                  >
                    {p.codigo}
                  </Link>
                </td>
                <td className="whitespace-nowrap text-slate-600">
                  {formatearFechaHora(p.creadoEn)}
                </td>
                <td>
                  <span className="block font-medium text-slate-900">{p.compradorNombre}</span>
                  <span className="text-xs text-slate-500">{p.compradorPais}</span>
                </td>
                <td>
                  <span className="block text-slate-900">{p.destNombre}</span>
                  <span className="text-xs text-slate-500">{p.municipio}</span>
                </td>
                <td className="text-right font-semibold tabular-nums">
                  {formatearMoneda(p.total, "USD")}
                </td>
                <td>
                  <BadgeEstado estado={p.estado} />
                </td>
                <td>
                  <BadgePago estado={p.estadoPago} />
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      {paginas > 1 && (
        <nav aria-label="Paginación" className="flex items-center justify-center gap-3">
          {pagina > 1 && (
            <ButtonLink
              href={href(f, { pagina: String(pagina - 1) })}
              variante="secundario"
              tamano="sm"
            >
              <IconChevronLeft size={16} /> Anterior
            </ButtonLink>
          )}
          <span className="text-sm text-slate-600">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <ButtonLink
              href={href(f, { pagina: String(pagina + 1) })}
              variante="secundario"
              tamano="sm"
            >
              Siguiente <IconChevronRight size={16} />
            </ButtonLink>
          )}
        </nav>
      )}
    </>
  );
}
