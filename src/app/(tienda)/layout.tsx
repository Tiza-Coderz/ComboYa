import { Avisos, EnlaceCarrito, EnlaceCarritoInferior } from "@/components/tienda/carrito-ui";
import { Footer } from "@/components/tienda/footer";
import { Header, NavegacionInferior } from "@/components/tienda/header";
import { MonedaProvider } from "@/components/tienda/moneda";
import { publicEnv } from "@/lib/env";
import { datosDelLayout } from "@/server/repositories/catalogo";

export default async function TiendaLayout({ children }: { children: React.ReactNode }) {
  const { tasas, config } = await datosDelLayout();
  return (
    <MonedaProvider tasas={tasas}>
      <a
        href="#contenido"
        className="focus:text-brand-800 sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        Saltar al contenido
      </a>
      <Header carrito={<EnlaceCarrito />} />
      <main id="contenido" className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {children}
      </main>
      <Footer config={config} demo={publicEnv.NEXT_PUBLIC_DEMO_MODE} />
      <NavegacionInferior carrito={<EnlaceCarritoInferior />} />
      <Avisos />
    </MonedaProvider>
  );
}
