"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChart,
  IconGift,
  IconList,
  IconMapPin,
  IconPackage,
  IconSettings,
  IconTag,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const ENLACES = [
  { href: "/admin", texto: "Resumen", icono: IconChart, exacto: true },
  { href: "/admin/pedidos", texto: "Pedidos", icono: IconList },
  { href: "/admin/productos", texto: "Productos", icono: IconPackage },
  { href: "/admin/combos", texto: "Combos", icono: IconGift },
  { href: "/admin/categorias", texto: "Categorías", icono: IconTag },
  { href: "/admin/zonas", texto: "Zonas de entrega", icono: IconMapPin },
  { href: "/admin/ajustes", texto: "Tasas y ajustes", icono: IconSettings },
];

export function NavAdmin() {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Panel"
      className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col">
        {ENLACES.map(({ href, texto, icono: Icono, exacto }) => {
          const activo = exacto ? ruta === href : ruta.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
                  activo
                    ? "text-brand-800 bg-white shadow-sm lg:bg-white/95"
                    : "text-brand-100 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icono size={18} />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
