import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/feedback";
import { IconImage } from "@/components/ui/icons";
import type { Producto } from "@/server/types";
import { Precio } from "./moneda";

export function ImagenProducto({
  producto,
  sizes,
  prioridad = false,
  className = "",
}: {
  producto: Pick<Producto, "imagen" | "nombre">;
  sizes: string;
  prioridad?: boolean;
  className?: string;
}) {
  if (!producto.imagen) {
    return (
      <div className={`grid place-items-center bg-slate-100 text-slate-400 ${className}`}>
        <IconImage size={40} />
      </div>
    );
  }
  return (
    <Image
      src={producto.imagen}
      alt={producto.nombre}
      fill
      sizes={sizes}
      priority={prioridad}
      className={`object-cover ${className}`}
    />
  );
}

export function ProductCard({
  producto,
  accion,
  prioridad = false,
}: {
  producto: Producto;
  accion?: ReactNode;
  prioridad?: boolean;
}) {
  const agotado = producto.stock !== null && producto.stock <= 0;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-slate-100">
        <ImagenProducto
          producto={producto}
          prioridad={prioridad}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {producto.tipo === "combo" && <Badge tono="marca">Combo</Badge>}
          {agotado && <Badge tono="peligro">Agotado</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold text-slate-900">
          <Link href={`/p/${producto.slug}`} className="after:absolute after:inset-0">
            {producto.nombre}
          </Link>
        </h3>
        {producto.unidad && <p className="text-xs text-slate-500">{producto.unidad}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <Precio centavos={producto.precioCentavos} />
          {accion && !agotado && <div className="relative z-10">{accion}</div>}
        </div>
      </div>
    </article>
  );
}

export function GridProductos({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{children}</div>
  );
}
