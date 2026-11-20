import type { Metadata } from "next";
import { FilaCategoria } from "@/components/admin/filas-editables";
import { Encabezado, Tarjeta } from "@/components/admin/ui";
import { Alert } from "@/components/ui/feedback";
import { IconTrash } from "@/components/ui/icons";
import { eliminarCategoria } from "@/server/actions/admin-catalogo";
import { requireAdmin } from "@/server/auth";
import { listarCategoriasAdmin } from "@/server/repositories/admin-catalogo";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const [{ ok, error }, categorias] = await Promise.all([
    searchParams,
    listarCategoriasAdmin(supabase),
  ]);
  return (
    <>
      <Encabezado
        titulo="Categorías"
        descripcion="Ordénelas con el número de «orden»: así aparecen en la tienda."
      />
      {ok && <Alert tono="exito">{ok}</Alert>}
      {error && <Alert tono="peligro">{error}</Alert>}
      <Tarjeta className="space-y-3 overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-[2fr_2fr_1fr_80px_auto] gap-2 pr-[52px] text-xs font-semibold text-slate-500 uppercase">
          <span>Nombre</span>
          <span>Slug</span>
          <span>Icono</span>
          <span>Orden</span>
          <span className="min-w-28" />
        </div>
        <ul className="min-w-[640px] space-y-2">
          {categorias.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <div className="flex-1">
                <FilaCategoria categoria={c} />
              </div>
              <form action={eliminarCategoria}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  disabled={c.productos > 0}
                  title={c.productos > 0 ? `Tiene ${c.productos} productos` : "Eliminar"}
                  aria-label={`Eliminar ${c.nombre}`}
                  className="hover:text-danger-600 grid size-9 place-items-center rounded-lg text-slate-400 disabled:opacity-30"
                >
                  <IconTrash size={16} />
                </button>
              </form>
            </li>
          ))}
          <li className="border-t border-slate-100 pt-3 pr-11">
            <FilaCategoria />
          </li>
        </ul>
      </Tarjeta>
    </>
  );
}
