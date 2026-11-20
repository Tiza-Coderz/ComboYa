import type { Metadata, Viewport } from "next";
import { RegistrarServiceWorker } from "@/components/registrar-sw";
import { publicEnv } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "ComboYa — Combos para su familia en La Habana",
    template: "%s · ComboYa",
  },
  description:
    "Compre desde el exterior combos de comida, aseo y bebidas. Entregamos a su familia en La Habana en 24–72 horas.",
  applicationName: "ComboYa",
  keywords: ["combos Cuba", "enviar comida a Cuba", "La Habana", "mercado online", "mipyme"],
  openGraph: {
    locale: "es_CU",
    siteName: "ComboYa",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "ComboYa", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0f4c75",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CU">
      <body className="min-h-dvh font-sans">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
