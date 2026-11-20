import type { Metadata } from "next";
import { FilaZona } from "@/components/admin/filas-editables";
import { Encabezado, Tarjeta } from "@/components/admin/ui";
import { Alert } from "@/components/ui/feedback";
import { IconTrash } from "@/components/ui/icons";
import { eliminarZona } from "@/server/actions/admin-catalogo";
import { requireAdmin } from "@/server/auth";
import { listarZonasAdmin } from "@/server/repositories/admin-catalogo";

export const metadata: Metadata = { title: "Zonas de entrega" };

export default async function ZonasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const [{ ok, error }, zonas] = await Promise.all([searchParams, listarZonasAdmin(supabase)]);
  return (
    <>
      <Encabezado
        titulo="Zonas de entrega"
        descripcion="Costo de envío y días estimados por municipio. Las zonas inactivas no aparecen en el checkout."
      />
      {ok && <Alert tono="exito">{ok}</Alert>}
      {error && <Alert tono="peligro">{error}</Alert>}
      <Tarjeta className="space-y-3 overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[2fr_1fr_70px_70px_auto_auto] gap-2 pr-11 text-xs font-semibold text-slate-500 uppercase">
          <span>Municipio</span>
          <span>Envío USD</span>
          <span>Días mín.</span>
          <span>Días máx.</span>
          <span className="w-14" />
          <span className="min-w-28" />
        </div>
        <ul className="min-w-[720px] space-y-2">
          {zonas.map((z) => (
            <li key={z.id} className="flex items-center gap-2">
              <div className="flex-1">
                <FilaZona zona={z} />
              </div>
              <form action={eliminarZona}>
                <input type="hidden" name="id" value={z.id} />
                <button
                  type="submit"
                  aria-label={`Eliminar ${z.municipio}`}
                  className="hover:text-danger-600 grid size-9 place-items-center rounded-lg text-slate-400"
                >
                  <IconTrash size={16} />
                </button>
              </form>
            </li>
          ))}
          <li className="border-t border-slate-100 pt-3 pr-11">
            <FilaZona />
          </li>
        </ul>
      </Tarjeta>
    </>
  );
}
