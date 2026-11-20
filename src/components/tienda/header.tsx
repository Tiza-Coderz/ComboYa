import Link from "next/link";
import type { ReactNode } from "react";
import { IconGift, IconHome, IconPackage, IconSearch, IconTruck } from "@/components/ui/icons";
import { SelectorMoneda } from "./moneda";

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 text-xl font-extrabold tracking-tight ${claro ? "text-white" : "text-brand-800"}`}
    >
      <span className="bg-accent-500 grid size-8 place-items-center rounded-lg text-white">
        <IconGift size={18} />
      </span>
      ComboYa
    </Link>
  );
}

function Buscador({ className = "" }: { className?: string }) {
  return (
    <form action="/productos" role="search" className={`relative ${className}`}>
      <label htmlFor="buscar" className="sr-only">
        Buscar productos
      </label>
      <IconSearch
        size={18}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
      />
      <input
        id="buscar"
        name="q"
        type="search"
        placeholder="Buscar arroz, pollo, combos…"
        className="h-10 w-full rounded-xl border-0 bg-white pr-3 pl-10 text-[15px] text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400 focus:outline-none"
      />
    </form>
  );
}

/**
 * Cabecera de la tienda. `carrito` es el enlace al carrito (componente cliente)
 * para que el resto de la cabecera siga siendo de servidor.
 */
export function Header({ carrito }: { carrito?: ReactNode }) {
  return (
    <header className="bg-brand-700 sticky top-0 z-40 text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Logo claro />
        <Buscador className="hidden flex-1 md:block" />
        <nav
          aria-label="Principal"
          className="hidden items-center gap-5 text-sm font-medium lg:flex"
        >
          <Link href="/productos?tipo=combo" className="hover:text-amber-300">
            Combos
          </Link>
          <Link href="/productos" className="hover:text-amber-300">
            Productos
          </Link>
          <Link href="/seguimiento" className="hover:text-amber-300">
            Mi pedido
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <SelectorMoneda />
          {carrito}
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <Buscador />
      </div>
    </header>
  );
}

export function NavegacionInferior({ carrito }: { carrito?: ReactNode }) {
  const enlaces = [
    { href: "/", texto: "Inicio", icono: <IconHome /> },
    { href: "/productos?tipo=combo", texto: "Combos", icono: <IconGift /> },
    { href: "/productos", texto: "Productos", icono: <IconPackage /> },
    { href: "/seguimiento", texto: "Mi pedido", icono: <IconTruck /> },
  ];
  return (
    <nav
      aria-label="Navegación rápida"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {enlaces.slice(0, 2).map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              className="hover:text-brand-700 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-600"
            >
              {e.icono}
              {e.texto}
            </Link>
          </li>
        ))}
        <li>{carrito}</li>
        {enlaces.slice(2).map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              className="hover:text-brand-700 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-600"
            >
              {e.icono}
              {e.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
