import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgregarAlCarrito } from "@/components/tienda/carrito-ui";
import { Precio } from "@/components/tienda/moneda";
import { GridProductos, ImagenProducto, ProductCard } from "@/components/tienda/product-card";
import { Seccion } from "@/components/tienda/seccion";
import { ButtonA } from "@/components/ui/button";
import { Badge } from "@/components/ui/feedback";
import { IconCheck, IconShare, IconTruck, IconWhatsApp } from "@/components/ui/icons";
import { aDolares, formatearMoneda } from "@/domain/money";
import { ahorroCombo } from "@/domain/pricing";
import { enlaceWhatsApp, mensajeCompartirProducto } from "@/domain/whatsapp";
import { paraCarrito } from "@/lib/carrito";
import { urlAbsoluta } from "@/lib/utils";
import {
  combosConProducto,
  datosDelLayout,
  obtenerProducto,
  productosRelacionados,
} from "@/server/repositories/catalogo";

export const revalidate = 60;

/** Sin rutas en el build: cada ficha se genera en la primera visita y queda en caché (ISR). */
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await obtenerProducto(slug).catch(() => null);
  if (!p) return { title: "Producto no encontrado" };
  const precio = formatearMoneda(p.precioCentavos, "USD");
  const descripcion =
    p.tipo === "combo"
      ? `${p.descripcion} Incluye ${p.items.reduce((n, i) => n + i.cantidad, 0)} productos. ${precio} con entrega en La Habana.`
      : `${p.descripcion} ${precio} con entrega a domicilio en La Habana.`;
  return {
    title: `${p.nombre} — ${precio}`,
    description: descripcion.slice(0, 200),
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: {
      type: "website",
      title: `${p.nombre} · ${precio}`,
      description: descripcion.slice(0, 200),
      url: `/p/${p.slug}`,
    },
  };
}

export default async function ProductoPage({ params }: { params: Params }) {
  const { slug } = await params;
  const producto = await obtenerProducto(slug);
  if (!producto) notFound();

  const [relacionados, combos, { config }] = await Promise.all([
    productosRelacionados(producto).catch(() => []),
    producto.tipo === "producto" ? combosConProducto(producto.id).catch(() => []) : [],
    datosDelLayout(),
  ]);

  const esCombo = producto.tipo === "combo";
  const ahorro = esCombo
    ? ahorroCombo(
        producto.precioCentavos,
        producto.items.map((i) => ({
          precioCentavos: i.producto.precioCentavos,
          cantidad: i.cantidad,
        })),
      )
    : null;
  const agotado = producto.stock !== null && producto.stock <= 0;
  const url = urlAbsoluta(`/p/${producto.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    description: producto.descripcion,
    image: producto.imagen ? urlAbsoluta(producto.imagen) : undefined,
    sku: producto.slug,
    category: producto.categoria?.nombre,
    offers: {
      "@type": "Offer",
      price: aDolares(producto.precioCentavos).toFixed(2),
      priceCurrency: "USD",
      availability: agotado ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url,
    },
  };

  return (
    <div className="space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Ruta" className="text-xs text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Inicio
        </Link>{" "}
        /{" "}
        <Link
          href={
            esCombo
              ? "/productos?tipo=combo"
              : `/productos?categoria=${producto.categoria?.slug ?? ""}`
          }
          className="hover:text-brand-700"
        >
          {esCombo ? "Combos" : (producto.categoria?.nombre ?? "Productos")}
        </Link>{" "}
        / <span className="text-slate-700">{producto.nombre}</span>
      </nav>

      <article className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
          <ImagenProducto producto={producto} prioridad sizes="(min-width: 768px) 50vw, 100vw" />
          {esCombo && ahorro && ahorro.porcentaje > 0 && (
            <span className="absolute top-4 left-4 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-950">
              Ahorra {ahorro.porcentaje}%
            </span>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {esCombo ? (
                <Badge tono="marca">Combo</Badge>
              ) : (
                producto.categoria && <Badge>{producto.categoria.nombre}</Badge>
              )}
              {agotado ? (
                <Badge tono="peligro">Agotado</Badge>
              ) : producto.stock !== null && producto.stock <= 10 ? (
                <Badge tono="aviso">¡Quedan {producto.stock}!</Badge>
              ) : (
                <Badge tono="exito">Disponible</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{producto.nombre}</h1>
            {producto.unidad && <p className="text-slate-600">{producto.unidad}</p>}
          </div>

          <div className="flex items-end gap-4">
            <Precio centavos={producto.precioCentavos} tamano="xl" />
            {ahorro && ahorro.ahorro > 0 && (
              <p className="pb-1 text-sm text-slate-500">
                Por separado: <s>{formatearMoneda(ahorro.valorSeparado, "USD")}</s>
              </p>
            )}
          </div>

          <div id="comprar">
            {agotado ? (
              <p className="text-sm text-slate-600">
                Este producto está agotado. Escríbanos y le avisamos cuando vuelva.
              </p>
            ) : (
              <AgregarAlCarrito
                producto={paraCarrito(producto)}
                maximo={producto.stock ?? undefined}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonA
              variante="whatsapp"
              tamano="sm"
              href={enlaceWhatsApp(
                config.whatsappNegocio,
                `Hola, tengo una pregunta sobre «${producto.nombre}» (${url}).`,
              )}
            >
              <IconWhatsApp size={16} /> Preguntar por WhatsApp
            </ButtonA>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                mensajeCompartirProducto({
                  nombre: producto.nombre,
                  precioCentavos: producto.precioCentavos,
                  url,
                }),
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-50"
            >
              <IconShare size={16} /> Compartir
            </a>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200">
            <IconTruck className="text-brand-700 mt-0.5 shrink-0" />
            <p className="text-slate-700">
              Entrega a domicilio en <strong>La Habana</strong> en 24–72 horas. El costo de envío
              depende del municipio y se calcula en el checkout.
            </p>
          </div>

          {producto.descripcion && (
            <p className="leading-relaxed text-slate-700">{producto.descripcion}</p>
          )}
        </div>
      </article>

      {esCombo && producto.items.length > 0 && (
        <Seccion titulo="¿Qué incluye este combo?" id="incluye">
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {producto.items.map((i) => (
              <li key={i.producto.id} className="flex items-center gap-3 p-3 sm:p-4">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <ImagenProducto producto={i.producto} sizes="56px" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/p/${i.producto.slug}`}
                    className="hover:text-brand-700 font-medium text-slate-900"
                  >
                    {i.producto.nombre}
                  </Link>
                  <p className="text-xs text-slate-500">{i.producto.unidad}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                  <IconCheck size={16} className="text-success-600" /> × {i.cantidad}
                </span>
              </li>
            ))}
          </ul>
          {ahorro && ahorro.ahorro > 0 && (
            <p className="text-sm text-slate-600">
              Comprando el combo ahorra <strong>{formatearMoneda(ahorro.ahorro, "USD")}</strong>{" "}
              frente a comprar los productos por separado.
            </p>
          )}
        </Seccion>
      )}

      {combos.length > 0 && (
        <Seccion titulo="También viene en estos combos" id="en-combos">
          <GridProductos>
            {combos.map((c) => (
              <ProductCard key={c.id} producto={c} />
            ))}
          </GridProductos>
        </Seccion>
      )}

      {relacionados.length > 0 && (
        <Seccion titulo={esCombo ? "Otros combos" : "Le puede interesar"} id="relacionados">
          <GridProductos>
            {relacionados.map((r) => (
              <ProductCard key={r.id} producto={r} />
            ))}
          </GridProductos>
        </Seccion>
      )}
    </div>
  );
}
