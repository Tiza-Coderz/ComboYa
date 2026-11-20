import type { Metadata } from "next";
import {
  BotonRestablecerDemo,
  FormConfiguracion,
  FormTasa,
} from "@/components/admin/formularios-ajustes";
import { Encabezado, Tabla, Tarjeta } from "@/components/admin/ui";
import { Badge } from "@/components/ui/feedback";
import { formatearMoneda } from "@/domain/money";
import { publicEnv } from "@/lib/env";
import { formatearFechaHora } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { obtenerConfiguracion } from "@/server/repositories/catalogo";

export const metadata: Metadata = { title: "Tasas y ajustes" };

interface FilaTasa {
  id: string;
  moneda: "CUP" | "EUR";
  tasa: number;
  vigente_desde: string;
}

export default async function AjustesPage() {
  const { supabase } = await requireAdmin();
  const [{ data: historial }, config] = await Promise.all([
    supabase
      .from("tasas_cambio")
      .select("id, moneda, tasa, vigente_desde")
      .order("vigente_desde", { ascending: false })
      .limit(20)
      .overrideTypes<FilaTasa[], { merge: false }>(),
    obtenerConfiguracion(),
  ]);
  const filas = historial ?? [];
  const vigente = (m: "CUP" | "EUR") => {
    const t = filas.find((f) => f.moneda === m);
    return t ? Number(t.tasa) : null;
  };
  const cup = vigente("CUP");

  return (
    <>
      <Encabezado
        titulo="Tasas y ajustes"
        descripcion="Los precios se guardan en USD; la tienda muestra el equivalente en CUP y EUR con la tasa vigente."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta className="space-y-3">
          <div>
            <h2 className="font-semibold text-slate-900">Tasa USD → CUP</h2>
            <p className="text-sm text-slate-600">
              {cup
                ? `Con ${cup} CUP, un combo de $49 se muestra como ≈ ${formatearMoneda(4900 * cup, "CUP")}.`
                : "Registre la tasa del día."}
            </p>
          </div>
          <FormTasa moneda="CUP" actual={cup} />
        </Tarjeta>
        <Tarjeta className="space-y-3">
          <div>
            <h2 className="font-semibold text-slate-900">Tasa USD → EUR</h2>
            <p className="text-sm text-slate-600">
              Para clientes que prefieren ver precios en euros.
            </p>
          </div>
          <FormTasa moneda="EUR" actual={vigente("EUR")} />
        </Tarjeta>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Historial de tasas</h2>
        <Tabla>
          <thead>
            <tr>
              <th>Desde</th>
              <th>Moneda</th>
              <th className="text-right">1 USD =</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filas.map((t, i) => (
              <tr key={t.id}>
                <td className="text-slate-600">{formatearFechaHora(t.vigente_desde)}</td>
                <td>{t.moneda}</td>
                <td className="text-right font-semibold tabular-nums">
                  {Number(t.tasa)} {t.moneda}
                </td>
                <td>
                  {filas.findIndex((f) => f.moneda === t.moneda) === i && (
                    <Badge tono="exito">Vigente</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </section>

      <Tarjeta className="space-y-4">
        <h2 className="font-semibold text-slate-900">Datos del negocio</h2>
        <FormConfiguracion inicial={config} />
      </Tarjeta>

      {publicEnv.NEXT_PUBLIC_DEMO_MODE && (
        <Tarjeta className="max-w-md space-y-3">
          <h2 className="font-semibold text-slate-900">Modo demo</h2>
          <p className="text-sm text-slate-600">
            Vuelve a crear el catálogo, las zonas, las tasas y 30 pedidos de ejemplo. Borra los
            cambios y las imágenes subidas.
          </p>
          <BotonRestablecerDemo />
        </Tarjeta>
      )}
    </>
  );
}
