import Image from "next/image";
import Link from "next/link";
import { IconChevronRight } from "@/components/ui/icons";
import type { Banner } from "@/server/types";

/**
 * Carrusel sin JavaScript: scroll horizontal con scroll-snap. En móvil se
 * desliza con el dedo; en escritorio, con la rueda o la barra.
 */
export function Banners({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;
  return (
    <section aria-label="Promociones" className="-mx-4 sm:mx-0">
      <ul className="flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {banners.map((b, i) => (
          <li key={b.id} className="w-[88%] shrink-0 snap-center sm:w-full">
            <Link
              href={b.enlace ?? "/productos"}
              className="bg-brand-800 relative flex aspect-[16/9] items-end overflow-hidden rounded-2xl p-5 text-white sm:aspect-[5/2] sm:p-10"
            >
              {b.imagen && (
                <Image
                  src={b.imagen}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1024px) 1100px, 90vw"
                  className="object-cover"
                />
              )}
              <div className="from-brand-900/80 absolute inset-0 bg-gradient-to-t via-transparent to-transparent sm:bg-gradient-to-r sm:via-transparent" />
              <div className="relative max-w-md space-y-2">
                <h2 className="text-2xl leading-tight font-extrabold sm:text-4xl">{b.titulo}</h2>
                {b.subtitulo && <p className="text-brand-100 text-sm sm:text-lg">{b.subtitulo}</p>}
                <span className="text-brand-900 mt-2 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold">
                  Ver ahora <IconChevronRight size={16} />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
