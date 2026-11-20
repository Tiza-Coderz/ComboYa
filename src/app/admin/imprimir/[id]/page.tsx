import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/admin/imprimir";
import { formatearMoneda } from "@/domain/money";
import { ETIQUETA_METODO, ETIQUETA_PAGO } from "@/domain/order-status";
import { formatearTelefonoCuba } from "@/domain/phone";
import { formatearFechaHora } from "@/lib/utils";
import { requireAdmin } from "@/server/auth";
import { obtenerPedidoAdmin } from "@/server/repositories/admin-pedidos";
import { obtenerConfiguracion } from "@/server/repositories/catalogo";

export const metadata: Metadata = { title: "Hoja de entrega", robots: { index: false } };

/** Hoja de entrega en A4/carta para el mensajero, con firma de recibido. */
export default async function ImprimirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [p, config] = await Promise.all([
    obtenerPedidoAdmin(supabase, id),
    obtenerConfiguracion().catch(() => null),
  ]);
  if (!p) notFound();
  const cobrar = p.metodoPago === "efectivo_entrega" && p.estadoPago !== "pagado";

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-[13px] text-black print:p-0">
      <div className="mb-6 flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <p className="text-2xl font-extrabold">{config?.nombreNegocio ?? "ComboYa"}</p>
          <p>Hoja de entrega · WhatsApp +{config?.whatsappNegocio}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-bold">{p.codigo}</p>
          <p>{formatearFechaHora(p.creadoEn)}</p>
          <div className="mt-2">
            <BotonImprimir />
          </div>
        </div>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-6">
        <div>
          <h2 className="mb-1 text-xs font-bold tracking-wider uppercase">Entregar a</h2>
          <p className="text-lg font-bold">{p.destNombre}</p>
          {p.destCarne && <p>Carné: {p.destCarne}</p>}
          <p>Tel.: {formatearTelefonoCuba(p.destTelefono)}</p>
          <p className="mt-1">{p.direccion}</p>
          <p className="font-semibold">{p.municipio}, La Habana</p>
          {p.referencia && <p className="italic">Ref.: {p.referencia}</p>}
        </div>
        <div>
          <h2 className="mb-1 text-xs font-bold tracking-wider uppercase">Enviado por</h2>
          <p className="font-semibold">{p.compradorNombre}</p>
          <p>
            {p.compradorPais} · {p.compradorTelefono}
          </p>
          <div className="mt-3 rounded border-2 border-black p-2">
            <p className="font-bold">
              {cobrar
                ? `COBRAR EN EFECTIVO: ${formatearMoneda(p.total, "USD")}`
                : "PAGADO — NO COBRAR"}
            </p>
            <p>
              {ETIQUETA_METODO[p.metodoPago]} · {ETIQUETA_PAGO[p.estadoPago]}
            </p>
          </div>
        </div>
      </section>

      <table className="mb-5 w-full border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="w-10 py-1">✓</th>
            <th className="w-16 py-1">Cant.</th>
            <th className="py-1">Producto</th>
          </tr>
        </thead>
        <tbody>
          {p.items.map((i) => (
            <tr key={i.id} className="border-b border-gray-300">
              <td className="py-1.5">☐</td>
              <td className="py-1.5 font-bold">{i.cantidad}</td>
              <td className="py-1.5">
                {i.nombre}
                {i.tipo === "combo" ? " (combo)" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {p.mensajeFamilia && (
        <section className="mb-5 rounded border border-dashed border-black p-3">
          <h2 className="mb-1 text-xs font-bold tracking-wider uppercase">
            Mensaje para la familia
          </h2>
          <p className="text-base italic">“{p.mensajeFamilia}”</p>
        </section>
      )}

      {p.notasInternas && (
        <section className="mb-5">
          <h2 className="mb-1 text-xs font-bold tracking-wider uppercase">Notas</h2>
          <p>{p.notasInternas}</p>
        </section>
      )}

      <section className="mt-10 grid grid-cols-2 gap-10">
        <div className="border-t border-black pt-1">Firma de quien recibe</div>
        <div className="border-t border-black pt-1">Fecha y hora de entrega</div>
      </section>
    </main>
  );
}
