import type { MetadataRoute } from "next";
import { urlAbsoluta } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/checkout", "/carrito", "/seguimiento/"],
    },
    sitemap: urlAbsoluta("/sitemap.xml"),
  };
}
