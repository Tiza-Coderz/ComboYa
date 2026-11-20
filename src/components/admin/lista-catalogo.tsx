import Image from "next/image";
import Link from "next/link";
import { Encabezado, Tabla } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { IconImage, IconPackage, IconPlus } from "@/components/ui/icons";
import { formatearMoneda } from "@/domain/money";
import { alternarProducto } from "@/server/actions/admin-catalogo";
import { requireAdmin } from "@/server/auth";
import { listarProductosAdmin } from "@/server/repositories/admin-catalogo";

/** Listado de productos o combos del panel (Server Component compartido). */
export async function ListaCatalogo({
  tipo,
  searchParams,
}: {
  tipo: "producto" | "combo";
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { supabase } = await requireAdmin();
  const q = typeof searchParams.q === "string" ? searchParams.q.slice(0, 40) : "";
  const ok = typeof searchParams.ok === "string" ? searchParams.ok : null;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const productos = await listarProductosAdmin(supabase, { tipo, q: q || undefined });
  const ruta = tipo === "combo" ? "/admin/combos" : "/admin/productos";
  const nuevo = tipo === "combo" ? "/admin/productos/nuevo?tipo=combo" : "/admin/productos/nuevo";

  return (
    <>
      <Encabezado
        titulo={tipo === "combo" ? "Combos" : "Productos"}
        descripcion={`${productos.length} ${tipo === "combo" ? "combos" : "productos"}${q ? ` que coinciden con «${q}»` : ""}`}
        acciones={
          <ButtonLink href={nuevo} tamano="sm">
            <IconPlus size={16} /> {tipo === "combo" ? "Nuevo combo" : "Nuevo producto"}
          </ButtonLink>
        }
      />
      {ok && <Alert tono="exito">{ok}</Alert>}
      {error && <Alert tono="peligro">{error}</Alert>}
      <form className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre"
          className="focus:ring-brand-500 h-10 w-full max-w-sm rounded-xl border-0 bg-white px-3 text-sm ring-1 ring-slate-300 focus:ring-2 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-brand-700 h-10 rounded-xl px-4 text-sm font-semibold text-white"
        >
          Buscar
        </button>
      </form>

      {productos.length === 0 ? (
        <EmptyState icono={<IconPackage />} titulo="No hay resultados" />
      ) : (
        <Tabla>
          <thead>
            <tr>
              <th className="w-16">Imagen</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th className="text-right">Precio</th>
              <th className="text-right">Existencias</th>
              <th>Visible</th>
              <th>Destacado</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className={p.activo ? "" : "bg-slate-50 text-slate-500"}>
                <td>
                  <div className="relative grid size-11 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
                    {p.imagen ? (
                      <Image src={p.imagen} alt="" fill sizes="44px" className="object-cover" />
                    ) : (
                      <IconImage size={18} />
                    )}
                  </div>
                </td>
                <td>
                  <Link
                    href={`/admin/productos/${p.id}`}
                    className="text-brand-700 font-semibold hover:underline"
                  >
                    {p.nombre}
                  </Link>
                  <span className="block text-xs text-slate-500">{p.unidad}</span>
                </td>
                <td>{p.categoria?.nombre}</td>
                <td className="text-right font-semibold tabular-nums">
                  {formatearMoneda(p.precioCentavos, "USD")}
                </td>
                <td className="text-right tabular-nums">
                  {p.stock === null ? (
                    <span className="text-slate-400">—</span>
                  ) : p.stock <= 5 ? (
                    <Badge tono={p.stock === 0 ? "peligro" : "aviso"}>{p.stock}</Badge>
                  ) : (
                    p.stock
                  )}
                </td>
                {(["activo", "destacado"] as const).map((campo) => (
                  <td key={campo}>
                    <form action={alternarProducto}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="campo" value={campo} />
                      <input type="hidden" name="valor" value={String(!p[campo])} />
                      <button
                        type="submit"
                        role="switch"
                        aria-checked={p[campo]}
                        aria-label={`${campo === "activo" ? "Visible" : "Destacado"}: ${p.nombre}`}
                        className={`relative h-6 w-11 rounded-full transition-colors ${p[campo] ? "bg-green-600" : "bg-slate-300"}`}
                      >
                        <span
                          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${p[campo] ? "left-[22px]" : "left-0.5"}`}
                        />
                      </button>
                    </form>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
      <p className="text-xs text-slate-500">
        Los cambios se ven en la tienda en menos de un minuto. <Link href={ruta}>Actualizar</Link>
      </p>
    </>
  );
}
