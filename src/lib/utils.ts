import { publicEnv } from "./env";

/** Une clases condicionales: cn("a", cond && "b") → "a b". */
export function cn(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(" ");
}

/** URL absoluta del sitio (para Open Graph, WhatsApp y sitemap). */
export function urlAbsoluta(ruta = "/"): string {
  return new URL(ruta, publicEnv.NEXT_PUBLIC_SITE_URL).toString();
}

/**
 * Las imágenes del seed viven en /public/catalogo (rutas relativas como
 * "productos/arroz.webp"); las que sube el admin son URLs públicas de Storage.
 */
export function urlImagen(ruta: string | null | undefined): string | null {
  if (!ruta) return null;
  if (/^https?:\/\//.test(ruta) || ruta.startsWith("/")) return ruta;
  return `/catalogo/${ruta}`;
}

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  timeZone: "America/Havana",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const formatoFechaHora = new Intl.DateTimeFormat("es-ES", {
  timeZone: "America/Havana",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "20 nov 2026" en hora de La Habana. */
export function formatearFecha(iso: string): string {
  return formatoFecha.format(new Date(iso));
}

/** "20 nov, 3:45 p. m." en hora de La Habana. */
export function formatearFechaHora(iso: string): string {
  return formatoFechaHora.format(new Date(iso));
}

/** Valor de una promesa resuelta o, si falló, el valor de respaldo. */
export function valorO<T, F>(r: PromiseSettledResult<T> | undefined, respaldo: F): T | F {
  return r?.status === "fulfilled" ? r.value : respaldo;
}

export function plural(n: number, singular: string, pluralForma = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}
