import type { MetadataRoute } from "next";
import { urlAbsoluta } from "@/lib/utils";
import { listarCategorias, listarSlugs } from "@/server/repositories/catalogo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [productos, categorias] = await Promise.all([
    listarSlugs().catch(() => []),
    listarCategorias().catch(() => []),
  ]);
  return [
    { url: urlAbsoluta("/"), changeFrequency: "daily", priority: 1 },
    { url: urlAbsoluta("/productos"), changeFrequency: "daily", priority: 0.9 },
    { url: urlAbsoluta("/productos?tipo=combo"), changeFrequency: "daily", priority: 0.9 },
    ...categorias
      .filter((c) => c.slug !== "combos")
      .map((c) => ({
        url: urlAbsoluta(`/productos?categoria=${c.slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ...productos.map((p) => ({
      url: urlAbsoluta(`/p/${p.slug}`),
      changeFrequency: "weekly" as const,
      priority: p.tipo === "combo" ? 0.8 : 0.6,
    })),
    { url: urlAbsoluta("/seguimiento"), changeFrequency: "monthly", priority: 0.3 },
  ];
}
