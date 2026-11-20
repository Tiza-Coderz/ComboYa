import type { Metadata } from "next";
import { VistaCarrito } from "@/components/tienda/vista-carrito";

export const metadata: Metadata = {
  title: "Mi carrito",
  robots: { index: false },
};

export default function CarritoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Mi carrito</h1>
      <VistaCarrito />
    </div>
  );
}
