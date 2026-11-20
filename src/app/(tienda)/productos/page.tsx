import type { Metadata } from "next";
import Link from "next/link";
import { GridProductos, ProductCard } from "@/components/tienda/product-card";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Select } from "@/components/ui/field";
import { IconChevronLeft, IconChevronRight, IconSearch } from "@/components/ui/icons";
import { cn, plural } from "@/lib/utils";
import {
  buscarProductos,
  listarCategorias,
  type FiltrosCatalogo,
  type Orden,
} from "@/server/repositories/catalogo";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function leerFiltros(sp: Record<string, string | string[] | undefined>): FiltrosCatalogo {
  const uno = (k: string) => (typeof sp[k] === "string" ? sp[k] : undefined);
  const orden = uno("orden");
  const tipo = uno("tipo");
  const precioMax = Number(uno("max"));
  return {
    q: uno("q")?.slice(0, 60),
    categoria: uno("categoria")?.replace(/[^a-z0-9-]/g, "") || undefined,
    tipo: tipo === "combo" || tipo === "producto" ? tipo : undefined,
    orden: (["precio-asc", "precio-desc", "nombre"] as const).includes(orden as never)
      ? (orden as Orden)
      : "relevancia",
    precioMax: Number.isFinite(precioMax) && precioMax > 0 ? precioMax : undefined,
    pagina: Math.max(1, Number(uno("pagina")) || 1),
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const f = leerFiltros(await searchParams);
  const titulo = f.q
    ? `Resultados para «${f.q}»`
    : f.tipo === "combo"
      ? "Combos para su familia"
      : "Catálogo de productos";
  return {
    title: titulo,
    description:
      "Combos, cárnicos, granos, aseo, bebidas y dulces con entrega a domicilio en La Habana.",
    alternates: { canonical: "/productos" },
  };
}

/** Construye la URL conservando los filtros actuales. */
function hrefCon(f: FiltrosCatalogo, cambios: Partial<Record<string, string | undefined>>) {
  const p = new URLSearchParams();
  const base: Record<string, string | undefined> = {
    q: f.q,
    categoria: f.categoria,
    tipo: f.tipo,
    orden: f.orden === "relevancia" ? undefined : f.orden,
    max: f.precioMax?.toString(),
    pagina: undefined,
    ...cambios,
  };
  for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/productos?${s}` : "/productos";
}

export default async function ProductosPage({ searchParams }: { searchParams: SearchParams }) {
  const f = leerFiltros(await searchParams);
  const [categorias, resultado] = await Promise.all([
    listarCategorias().catch(() => []),
    buscarProductos(f).catch(() => null),
  ]);

  const titulo =
    f.tipo === "combo"
      ? "Combos"
      : f.categoria
        ? (categorias.find((c) => c.slug === f.categoria)?.nombre ?? "Productos")
        : "Todos los productos";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <nav aria-label="Ruta" className="text-xs text-slate-500">
          <Link href="/" className="hover:text-brand-700">
            Inicio
          </Link>{" "}
          / Catálogo
        </nav>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {f.q ? <>Resultados para «{f.q}»</> : titulo}
        </h1>
        {resultado && (
          <p className="text-sm text-slate-600">
            {plural(resultado.total, "producto encontrado", "productos encontrados")}
          </p>
        )}
      </div>

      {/* Filtros rápidos por categoría: enlaces, funcionan sin JavaScript. */}
      <nav aria-label="Categorías" className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4">
        <ul className="flex gap-2">
          <li>
            <Link
              href={hrefCon(f, { categoria: undefined, tipo: undefined })}
              aria-current={!f.categoria && !f.tipo ? "page" : undefined}
              className={cn(
                "inline-block rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ring-1",
                !f.categoria && !f.tipo
                  ? "bg-brand-700 ring-brand-700 text-white"
                  : "hover:ring-brand-300 bg-white text-slate-700 ring-slate-200",
              )}
            >
              Todo
            </Link>
          </li>
          {categorias.map((c) => {
            const esCombos = c.slug === "combos";
            const activo = esCombos ? f.tipo === "combo" && !f.categoria : f.categoria === c.slug;
            return (
              <li key={c.id}>
                <Link
                  href={
                    esCombos
                      ? hrefCon(f, { categoria: undefined, tipo: "combo" })
                      : hrefCon(f, { categoria: c.slug, tipo: undefined })
                  }
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "inline-block rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap ring-1",
                    activo
                      ? "bg-brand-700 ring-brand-700 text-white"
                      : "hover:ring-brand-300 bg-white text-slate-700 ring-slate-200",
                  )}
                >
                  {c.nombre}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Búsqueda, orden y precio: formulario GET (sin JavaScript). */}
      <form
        action="/productos"
        className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end"
      >
        {f.categoria && <input type="hidden" name="categoria" value={f.categoria} />}
        {f.tipo && <input type="hidden" name="tipo" value={f.tipo} />}
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-700">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={f.q}
            placeholder="Ej. frijoles, cerveza, combo"
            className="focus:ring-brand-500 block h-11 w-full rounded-xl border-0 px-3 text-[15px] ring-1 ring-slate-300 focus:ring-2 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="orden" className="mb-1 block text-xs font-medium text-slate-700">
            Ordenar por
          </label>
          <Select id="orden" name="orden" defaultValue={f.orden} className="h-11">
            <option value="relevancia">Recomendados</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre (A–Z)</option>
          </Select>
        </div>
        <div>
          <label htmlFor="max" className="mb-1 block text-xs font-medium text-slate-700">
            Precio máximo
          </label>
          <Select id="max" name="max" defaultValue={f.precioMax?.toString() ?? ""} className="h-11">
            <option value="">Cualquiera</option>
            <option value="5">Hasta $5</option>
            <option value="15">Hasta $15</option>
            <option value="30">Hasta $30</option>
            <option value="60">Hasta $60</option>
          </Select>
        </div>
        <button
          type="submit"
          className="bg-brand-700 hover:bg-brand-800 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white"
        >
          <IconSearch size={18} /> Aplicar
        </button>
      </form>

      {resultado === null ? (
        <Alert tono="peligro" titulo="No pudimos cargar los productos">
          Puede deberse a la conexión. Recargue la página en unos segundos.
        </Alert>
      ) : resultado.items.length === 0 ? (
        <EmptyState
          icono={<IconSearch />}
          titulo="No encontramos productos"
          accion={
            <ButtonLink href="/productos" variante="secundario">
              Ver todo el catálogo
            </ButtonLink>
          }
        >
          Pruebe con otra palabra o quite algún filtro. También puede escribirnos por WhatsApp y le
          ayudamos a encontrarlo.
        </EmptyState>
      ) : (
        <>
          <GridProductos>
            {resultado.items.map((p, i) => (
              <ProductCard key={p.id} producto={p} prioridad={i < 4} />
            ))}
          </GridProductos>

          {resultado.paginas > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-center gap-3">
              {f.pagina && f.pagina > 1 ? (
                <ButtonLink
                  href={hrefCon(f, { pagina: String(f.pagina - 1) })}
                  variante="secundario"
                  tamano="sm"
                >
                  <IconChevronLeft size={16} /> Anterior
                </ButtonLink>
              ) : null}
              <span className="text-sm text-slate-600">
                Página {f.pagina} de {resultado.paginas}
              </span>
              {(f.pagina ?? 1) < resultado.paginas ? (
                <ButtonLink
                  href={hrefCon(f, { pagina: String((f.pagina ?? 1) + 1) })}
                  variante="secundario"
                  tamano="sm"
                >
                  Siguiente <IconChevronRight size={16} />
                </ButtonLink>
              ) : null}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
