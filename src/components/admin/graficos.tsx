import { formatearMoneda } from "@/domain/money";

/*
 * Gráficos ligeros en HTML/CSS (sin librerías: cero JS en el cliente).
 * Una sola serie por gráfico → un único tono de marca; el texto usa tintas
 * neutras. Cada barra tiene tooltip al pasar el ratón o al enfocarla con el
 * teclado, y cada gráfico ofrece su tabla de datos.
 */

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg group-focus-within:block group-hover:block"
    >
      {children}
    </span>
  );
}

function TablaDatos({ titulo, filas }: { titulo: string; filas: [string, string][] }) {
  return (
    <details className="mt-3 text-xs text-slate-600">
      <summary className="cursor-pointer select-none hover:text-slate-900">
        Ver datos en tabla
      </summary>
      <table className="mt-2 w-full">
        <caption className="sr-only">{titulo}</caption>
        <tbody>
          {filas.map(([a, b]) => (
            <tr key={a} className="border-b border-slate-100">
              <th scope="row" className="py-1 text-left font-normal">
                {a}
              </th>
              <td className="py-1 text-right tabular-nums">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

const fechaCorta = (f: string) => {
  const [, m, d] = f.split("-");
  return `${Number(d)}/${Number(m)}`;
};

/** Ventas por día: columnas verticales ancladas a la base. */
export function GraficoVentasDia({
  datos,
}: {
  datos: { fecha: string; total: number; pedidos: number }[];
}) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  const marcas = [max, max / 2];
  const cadaN = datos.length > 14 ? 5 : 1;
  return (
    <figure>
      <div className="relative h-48 pl-12">
        {marcas.map((v) => (
          <div
            key={v}
            className="absolute right-0 left-12 border-t border-dashed border-slate-200"
            style={{ bottom: `${(v / max) * 100}%` }}
          >
            <span className="absolute -top-2 -left-12 w-11 text-right text-[10px] text-slate-400 tabular-nums">
              {formatearMoneda(v, "USD").replace(/\.\d\d$/, "")}
            </span>
          </div>
        ))}
        <div className="flex h-full items-end gap-[2px] border-b border-slate-300">
          {datos.map((d) => (
            <div key={d.fecha} className="group relative flex h-full flex-1 items-end">
              <Tooltip>
                {fechaCorta(d.fecha)}: <strong>{formatearMoneda(d.total, "USD")}</strong> ·{" "}
                {d.pedidos} {d.pedidos === 1 ? "pedido" : "pedidos"}
              </Tooltip>
              <button
                type="button"
                aria-label={`${fechaCorta(d.fecha)}: ${formatearMoneda(d.total, "USD")}, ${d.pedidos} pedidos`}
                className="bg-brand-600 group-hover:bg-brand-800 focus-visible:bg-brand-800 w-full max-w-6 cursor-default rounded-t-[4px] transition-colors"
                style={{ height: d.total > 0 ? `max(${(d.total / max) * 100}%, 3px)` : "0" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-[2px] pl-12 text-[10px] text-slate-400">
        {datos.map((d, i) => (
          <span key={d.fecha} className="flex-1 text-center">
            {i % cadaN === 0 || i === datos.length - 1 ? fechaCorta(d.fecha) : ""}
          </span>
        ))}
      </div>
      <TablaDatos
        titulo="Ventas por día"
        filas={datos.map((d) => [d.fecha, `${formatearMoneda(d.total, "USD")} · ${d.pedidos}`])}
      />
    </figure>
  );
}

/** Barras horizontales ordenadas (top productos, municipios). */
export function BarrasHorizontales({
  titulo,
  datos,
}: {
  titulo: string;
  datos: { etiqueta: string; valor: number; detalle: string }[];
}) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  if (datos.length === 0) return <p className="text-sm text-slate-500">Sin datos en el periodo.</p>;
  return (
    <figure>
      <ul className="space-y-2.5">
        {datos.map((d) => (
          <li key={d.etiqueta} className="group relative" tabIndex={0}>
            <Tooltip>
              {d.etiqueta}: <strong>{d.detalle}</strong>
            </Tooltip>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate text-slate-700">{d.etiqueta}</span>
              <span className="shrink-0 font-semibold text-slate-900 tabular-nums">
                {d.detalle}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="bg-brand-600 group-hover:bg-brand-800 h-2 rounded-full transition-colors"
                style={{ width: `${Math.max(2, (d.valor / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <TablaDatos titulo={titulo} filas={datos.map((d) => [d.etiqueta, d.detalle])} />
    </figure>
  );
}
