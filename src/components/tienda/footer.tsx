import Link from "next/link";
import { ButtonA } from "@/components/ui/button";
import { IconClock, IconWhatsApp } from "@/components/ui/icons";
import { enlaceWhatsApp } from "@/domain/whatsapp";
import { formatearTelefonoCuba } from "@/domain/phone";
import type { Configuracion } from "@/server/types";
import { Logo } from "./header";

export function Footer({ config, demo }: { config: Configuracion; demo: boolean }) {
  const wa = enlaceWhatsApp(
    config.whatsappNegocio,
    "Hola, quisiera hacer una consulta sobre los combos.",
  );
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white pb-24 md:pb-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-slate-600">
            Combos de comida, aseo y bebidas para su familia en La Habana. Usted compra desde el
            exterior; nosotros entregamos en la puerta.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Tienda</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              <Link href="/productos?tipo=combo" className="hover:text-brand-700">
                Combos
              </Link>
            </li>
            <li>
              <Link href="/productos" className="hover:text-brand-700">
                Todos los productos
              </Link>
            </li>
            <li>
              <Link href="/seguimiento" className="hover:text-brand-700">
                Seguir mi pedido
              </Link>
            </li>
            <li>
              <Link href="/carrito" className="hover:text-brand-700">
                Mi carrito
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Atención al cliente</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>
              WhatsApp: +{config.whatsappNegocio.slice(0, 2)}{" "}
              {formatearTelefonoCuba(config.whatsappNegocio.slice(2))}
            </li>
            {config.emailContacto && <li>{config.emailContacto}</li>}
            {config.horario && (
              <li className="flex items-start gap-1.5">
                <IconClock size={16} className="mt-0.5 shrink-0" /> {config.horario}
              </li>
            )}
          </ul>
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">¿Tiene dudas?</h2>
          <ButtonA href={wa} variante="whatsapp" tamano="md">
            <IconWhatsApp /> Escríbanos por WhatsApp
          </ButtonA>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {config.nombreNegocio} · La Habana, Cuba
        {demo && (
          <>
            {" · "}
            <span className="font-medium text-amber-700">
              Demo de portafolio: los pedidos no son reales
            </span>
            {" · "}
            <Link href="/admin/login" className="hover:text-brand-700 underline">
              Panel de administración
            </Link>
          </>
        )}
      </div>
    </footer>
  );
}
