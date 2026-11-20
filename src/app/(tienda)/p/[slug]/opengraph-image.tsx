import { ImageResponse } from "next/og";
import { convertir, formatearMoneda } from "@/domain/money";
import { obtenerProducto, obtenerTasas } from "@/server/repositories/catalogo";

export const alt = "Producto de ComboYa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

/**
 * Imagen para compartir en WhatsApp/Facebook: nombre, precio en USD y CUP.
 * (WhatsApp no muestra bien WebP en las vistas previas; esto genera un PNG.)
 */
export default async function Imagen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [producto, tasas] = await Promise.all([
    obtenerProducto(slug).catch(() => null),
    obtenerTasas().catch(() => ({})),
  ]);

  const nombre = producto?.nombre ?? "ComboYa";
  const precio = producto ? formatearMoneda(producto.precioCentavos, "USD") : "";
  const cup = producto ? convertir(producto.precioCentavos, "CUP", tasas) : null;
  const esCombo = producto?.tipo === "combo";
  const detalle = esCombo
    ? `Incluye ${producto?.items.reduce((n, i) => n + i.cantidad, 0) ?? 0} productos`
    : (producto?.unidad ?? "Combos para su familia en La Habana");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #0a2f48 0%, #0f4c75 60%, #1b5d8e 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 40, fontWeight: 800 }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "#f59e0b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
          }}
        >
          C
        </div>
        ComboYa
        {esCombo && (
          <div
            style={{
              marginLeft: 16,
              fontSize: 26,
              fontWeight: 700,
              background: "#d5e8f4",
              color: "#0a2f48",
              padding: "6px 18px",
              borderRadius: 999,
            }}
          >
            COMBO
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: nombre.length > 28 ? 64 : 80, fontWeight: 800, lineHeight: 1.05 }}>
          {nombre}
        </div>
        <div style={{ fontSize: 34, color: "#aed2ea" }}>{detalle}</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: "#fbbf24" }}>{precio}</div>
          {cup !== null && (
            <div style={{ fontSize: 30, color: "#d5e8f4" }}>
              {/* Solo caracteres de la fuente incluida en next/og (sin "≈"). */}
              {`Aprox. ${formatearMoneda(cup, "CUP").replaceAll(String.fromCharCode(160), " ")}`}
            </div>
          )}
        </div>
        <div style={{ fontSize: 30, color: "#d5e8f4" }}>Entrega en La Habana en 24-72 horas</div>
      </div>
    </div>,
    size,
  );
}
