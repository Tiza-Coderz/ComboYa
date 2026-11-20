import type { Metadata } from "next";
import { Checkout } from "@/components/tienda/checkout";
import { Alert } from "@/components/ui/feedback";
import { listarZonas } from "@/server/repositories/catalogo";

export const metadata: Metadata = {
  title: "Hacer el pedido",
  robots: { index: false },
};

export const revalidate = 60;

export default async function CheckoutPage() {
  const zonas = await listarZonas().catch(() => null);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Hacer el pedido</h1>
      {zonas === null ? (
        <Alert tono="peligro" titulo="No pudimos cargar los municipios de entrega">
          Recargue la página en unos segundos.
        </Alert>
      ) : (
        <Checkout zonas={zonas} />
      )}
    </div>
  );
}
