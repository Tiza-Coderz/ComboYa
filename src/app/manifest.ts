import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ComboYa — Combos para su familia en La Habana",
    short_name: "ComboYa",
    description: "Compre combos de comida y aseo desde el exterior con entrega en La Habana.",
    lang: "es-CU",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#0f4c75",
    categories: ["shopping", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Combos", url: "/productos?tipo=combo" },
      { name: "Mi carrito", url: "/carrito" },
      { name: "Seguir mi pedido", url: "/seguimiento" },
    ],
  };
}
