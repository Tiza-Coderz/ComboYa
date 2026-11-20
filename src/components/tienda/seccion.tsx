import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronRight } from "@/components/ui/icons";

export function Seccion({
  titulo,
  descripcion,
  enlace,
  children,
  id,
}: {
  titulo: string;
  descripcion?: string;
  enlace?: { href: string; texto: string };
  children: ReactNode;
  id?: string;
}) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id={id} className="text-xl font-bold text-slate-900 sm:text-2xl">
            {titulo}
          </h2>
          {descripcion && <p className="mt-1 text-sm text-slate-600">{descripcion}</p>}
        </div>
        {enlace && (
          <Link
            href={enlace.href}
            className="text-brand-700 hover:text-brand-900 inline-flex shrink-0 items-center text-sm font-semibold"
          >
            {enlace.texto} <IconChevronRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
