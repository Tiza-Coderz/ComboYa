import Link from "next/link";
import { Banners } from "@/components/tienda/banners";
import { GridProductos, ProductCard } from "@/components/tienda/product-card";
import { Seccion } from "@/components/tienda/seccion";
import { ButtonA, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import {
  IconCategoria,
  IconMapPin,
  IconShield,
  IconTruck,
  IconWhatsApp,
} from "@/components/ui/icons";
import { formatearMoneda } from "@/domain/money";
import { enlaceWhatsApp } from "@/domain/whatsapp";
import { valorO } from "@/lib/utils";
import {
  datosDelLayout,
  listarBanners,
  listarCategorias,
  listarDestacados,
  listarZonas,
} from "@/server/repositories/catalogo";

export const revalidate = 60;

export default async function InicioPage() {
  // Cada bloque se carga por separado: si uno falla, el resto de la página se muestra.
  const [rBanners, rCategorias, rCombos, rProductos, rZonas, { config }] = await Promise.all([
    Promise.allSettled([listarBanners()]),
    Promise.allSettled([listarCategorias()]),
    Promise.allSettled([listarDestacados("combo", 6)]),
    Promise.allSettled([listarDestacados("producto", 8)]),
    Promise.allSettled([listarZonas()]),
    datosDelLayout(),
  ]);
  const banners = valorO(rBanners[0], []);
  const categorias = valorO(rCategorias[0], []);
  const combos = valorO(rCombos[0], null);
  const productos = valorO(rProductos[0], []);
  const zonas = valorO(rZonas[0], []);

  const envioDesde = zonas.length ? Math.min(...zonas.map((z) => z.costoCentavos)) : null;

  return (
    <div className="space-y-12">
      <Banners banners={banners} />

      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Por qué comprar con nosotros">
        {[
          {
            icono: <IconTruck />,
            titulo: "Entrega en 24–72 horas",
            texto: "En los 15 municipios de La Habana",
          },
          {
            icono: <IconShield />,
            titulo: "Pague desde el exterior",
            texto: "TropiPay, Zelle o efectivo al entregar",
          },
          {
            icono: <IconWhatsApp />,
            titulo: "Le avisamos por WhatsApp",
            texto: "Y siga su pedido en línea",
          },
        ].map((v) => (
          <li
            key={v.titulo}
            className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          >
            <span className="bg-brand-50 text-brand-700 grid size-11 shrink-0 place-items-center rounded-xl">
              {v.icono}
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">{v.titulo}</span>
              <span className="block text-xs text-slate-600">{v.texto}</span>
            </span>
          </li>
        ))}
      </ul>

      {combos === null && (
        <Alert tono="aviso" titulo="No pudimos cargar el catálogo">
          Revise su conexión e intente de nuevo en unos segundos.
        </Alert>
      )}

      {categorias.length > 0 && (
        <Seccion titulo="Categorías" id="categorias">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {categorias.map((c) => (
              <li key={c.id}>
                <Link
                  href={
                    c.slug === "combos" ? "/productos?tipo=combo" : `/productos?categoria=${c.slug}`
                  }
                  className="hover:ring-brand-300 flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center ring-1 ring-slate-200 transition hover:shadow-sm"
                >
                  <span className="bg-brand-50 text-brand-700 grid size-12 place-items-center rounded-full">
                    <IconCategoria icono={c.icono} size={22} />
                  </span>
                  <span className="text-xs font-semibold text-slate-800 sm:text-sm">
                    {c.nombre}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {combos && combos.length > 0 && (
        <Seccion
          titulo="Combos más pedidos"
          descripcion="Pensados para resolver la semana o el mes de su familia."
          enlace={{ href: "/productos?tipo=combo", texto: "Ver todos" }}
          id="combos"
        >
          <GridProductos>
            {combos.map((p, i) => (
              <ProductCard key={p.id} producto={p} prioridad={i < 2} />
            ))}
          </GridProductos>
        </Seccion>
      )}

      <section
        aria-labelledby="como-funciona"
        className="bg-brand-700 rounded-3xl px-5 py-8 text-white sm:px-10"
      >
        <h2 id="como-funciona" className="text-xl font-bold sm:text-2xl">
          ¿Cómo funciona?
        </h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            ["Elija", "Arme su pedido con combos o productos sueltos."],
            ["Indique quién recibe", "Nombre, teléfono y dirección de su familiar en La Habana."],
            ["Pague y siga el pedido", "Le confirmamos por WhatsApp y le avisamos al entregar."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-4">
              <span className="text-brand-900 grid size-9 shrink-0 place-items-center rounded-full bg-amber-400 font-bold">
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="text-brand-100 block text-sm">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {productos.length > 0 && (
        <Seccion
          titulo="Productos destacados"
          enlace={{ href: "/productos", texto: "Ver catálogo" }}
          id="destacados"
        >
          <GridProductos>
            {productos.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </GridProductos>
        </Seccion>
      )}

      {zonas.length > 0 && (
        <section
          aria-labelledby="zonas"
          className="grid gap-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200 sm:grid-cols-[1fr_2fr] sm:p-8"
        >
          <div className="space-y-2">
            <h2 id="zonas" className="text-xl font-bold text-slate-900">
              Entregamos en toda La Habana
            </h2>
            {envioDesde !== null && (
              <p className="text-sm text-slate-600">
                Envío desde <strong>{formatearMoneda(envioDesde, "USD")}</strong>, según el
                municipio.
              </p>
            )}
          </div>
          <ul className="flex flex-wrap gap-2">
            {zonas.map((z) => (
              <li
                key={z.id}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
              >
                <IconMapPin size={14} /> {z.municipio}
              </li>
            ))}
          </ul>
        </section>
      )}

      {config && (
        <section className="flex flex-col items-center gap-4 rounded-3xl bg-green-50 px-6 py-10 text-center ring-1 ring-green-200">
          <h2 className="text-xl font-bold text-slate-900">
            ¿Prefiere hacer su pedido por WhatsApp?
          </h2>
          <p className="max-w-md text-sm text-slate-600">
            Escríbanos y le ayudamos a armar el combo ideal para su familia.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonA
              variante="whatsapp"
              tamano="lg"
              href={enlaceWhatsApp(
                config.whatsappNegocio,
                "Hola, quisiera ayuda para armar un combo.",
              )}
            >
              <IconWhatsApp /> Escribir por WhatsApp
            </ButtonA>
            <ButtonLink href="/productos" variante="secundario" tamano="lg">
              Ver catálogo
            </ButtonLink>
          </div>
        </section>
      )}
    </div>
  );
}
