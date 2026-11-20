import type { Metadata } from "next";
import Link from "next/link";
import { NavAdmin } from "@/components/admin/nav";
import { IconLogout } from "@/components/ui/icons";
import { publicEnv } from "@/lib/env";
import { cerrarSesion } from "@/server/actions/auth";
import { requireAdmin } from "@/server/auth";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel ComboYa" },
  robots: { index: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { nombre, user } = await requireAdmin();
  return (
    <div className="min-h-dvh bg-slate-100 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="bg-brand-800 text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <Link href="/admin" className="text-lg font-extrabold">
            ComboYa <span className="text-brand-200 text-xs font-medium">Panel</span>
          </Link>
          <Link href="/" className="text-brand-200 text-xs hover:text-white lg:hidden">
            Ver tienda ↗
          </Link>
        </div>
        <div className="px-4 pb-3 lg:flex-1 lg:px-3">
          <NavAdmin />
        </div>
        <div className="border-brand-700 hidden space-y-2 border-t p-4 text-sm lg:block">
          <p className="truncate font-medium">{nombre}</p>
          <p className="text-brand-200 truncate text-xs">{user.email}</p>
          <div className="flex items-center justify-between">
            <Link href="/" className="text-brand-200 text-xs hover:text-white">
              Ver tienda ↗
            </Link>
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="text-brand-100 inline-flex items-center gap-1 text-xs hover:text-white"
              >
                <IconLogout size={14} /> Salir
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        {publicEnv.NEXT_PUBLIC_DEMO_MODE && (
          <p className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
            Modo demo: puede cambiar lo que quiera; use «Restablecer demo» en el login para volver a
            empezar.
          </p>
        )}
        <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">{children}</main>
        <form action={cerrarSesion} className="p-4 text-center lg:hidden">
          <button type="submit" className="text-sm text-slate-600 underline">
            Cerrar sesión ({user.email})
          </button>
        </form>
      </div>
    </div>
  );
}
