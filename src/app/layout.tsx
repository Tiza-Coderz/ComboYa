import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ComboYa — Combos para su familia en La Habana",
    template: "%s · ComboYa",
  },
  description:
    "Compre desde el exterior combos de comida, aseo y bebidas. Entregamos a su familia en La Habana en 24–72 horas.",
  applicationName: "ComboYa",
  openGraph: { locale: "es_CU", siteName: "ComboYa", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0f4c75",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CU" className={inter.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
