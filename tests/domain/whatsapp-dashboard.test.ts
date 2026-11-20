import { describe, expect, it } from "vitest";
import { fechaHabana, resumirPedidos, ultimosDias, type PedidoDashboard } from "@/domain/dashboard";
import {
  enlaceWhatsApp,
  mensajeAvisoDestinatario,
  mensajeCompartirProducto,
  mensajeContactoComprador,
  mensajeNuevoPedido,
} from "@/domain/whatsapp";

describe("WhatsApp", () => {
  it("arma el enlace wa.me con el texto codificado", () => {
    const url = enlaceWhatsApp("52345678", "Hola, ¿qué tal?");
    expect(url).toBe("https://wa.me/5352345678?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F");
  });

  it("resume el pedido para el negocio", () => {
    const texto = mensajeNuevoPedido({
      codigo: "CY-4821",
      compradorNombre: "Yanelis Rodríguez",
      compradorPais: "Estados Unidos",
      destNombre: "Caridad Pérez",
      municipio: "Playa",
      items: [
        { nombre: "Combo Familiar Básico", cantidad: 1, precioCentavos: 4900 },
        { nombre: "Café molido Serrano", cantidad: 2, precioCentavos: 490 },
      ],
      subtotal: 5880,
      envio: 300,
      total: 6180,
      metodoPago: "enlace_pago",
      urlSeguimiento: "https://comboya.app/seguimiento/CY-4821",
      tasas: { CUP: 410 },
    });
    expect(texto).toContain("*CY-4821*");
    expect(texto).toContain("• 2 × Café molido Serrano — $9.80");
    expect(texto).toContain("*Total: $61.80* (≈ 25 338 CUP)");
    expect(texto).toContain("TropiPay");
    expect(texto).toContain("https://comboya.app/seguimiento/CY-4821");
  });

  it("sin tasas no muestra el equivalente en CUP", () => {
    const texto = mensajeNuevoPedido({
      codigo: "CY-1000",
      compradorNombre: "A",
      compradorPais: "España",
      destNombre: "B",
      municipio: "Cerro",
      items: [],
      subtotal: 0,
      envio: 0,
      total: 0,
      metodoPago: "efectivo_entrega",
      urlSeguimiento: "u",
    });
    expect(texto).not.toContain("CUP");
    expect(texto).toContain("Efectivo");
  });

  it("avisa al destinatario con su primer nombre y el estado", () => {
    const texto = mensajeAvisoDestinatario({
      destNombre: "Caridad Pérez Linares",
      compradorNombre: "Yanelis Rodríguez",
      codigo: "CY-4821",
      estado: "en_camino",
      nombreNegocio: "ComboYa",
      urlSeguimiento: "https://x/seguimiento/CY-4821",
    });
    expect(texto.startsWith("Hola, Caridad.")).toBe(true);
    expect(texto).toContain("Yanelis le envió un pedido");
    expect(texto).toContain("*En camino*");
    expect(texto).toContain("pendiente del teléfono");
  });

  it("estado sin detalle extra no deja líneas vacías", () => {
    const texto = mensajeAvisoDestinatario({
      destNombre: "Orlando",
      compradorNombre: "Raúl",
      codigo: "CY-1111",
      estado: "pendiente",
      nombreNegocio: "ComboYa",
      urlSeguimiento: "u",
    });
    expect(texto.split("\n")).toHaveLength(3);
  });

  it("contacta al comprador según el método de pago", () => {
    const base = { compradorNombre: "Raúl Martínez", codigo: "CY-1", nombreNegocio: "ComboYa", total: 5000 };
    expect(mensajeContactoComprador({ ...base, metodoPago: "enlace_pago" })).toContain("enlace de pago por $50.00");
    expect(mensajeContactoComprador({ ...base, metodoPago: "efectivo_entrega" })).toContain("en efectivo");
  });

  it("comparte un producto", () => {
    expect(mensajeCompartirProducto({ nombre: "Combo Cárnico", precioCentavos: 5900, url: "https://x/p/combo-carnico" })).toBe(
      "Mira este Combo Cárnico por $59.00 con entrega en La Habana: https://x/p/combo-carnico",
    );
  });
});

describe("dashboard", () => {
  // 20 de noviembre de 2026, 15:00 en La Habana (UTC-5).
  const hoy = new Date("2026-11-20T20:00:00Z");

  const pedido = (p: Partial<PedidoDashboard>): PedidoDashboard => ({
    creadoEn: "2026-11-20T15:00:00Z",
    totalCentavos: 5000,
    estado: "entregado",
    estadoPago: "pagado",
    municipio: "Playa",
    items: [],
    ...p,
  });

  it("usa la fecha de La Habana, no la UTC", () => {
    // 02:00 UTC del día 21 todavía es día 20 en La Habana.
    expect(fechaHabana("2026-11-21T02:00:00Z")).toBe("2026-11-20");
    expect(ultimosDias(3, hoy)).toEqual(["2026-11-18", "2026-11-19", "2026-11-20"]);
  });

  it("calcula ventas, ticket medio y por cobrar sin contar cancelados", () => {
    const r = resumirPedidos(
      [
        pedido({ totalCentavos: 6000 }),
        pedido({ totalCentavos: 4000, estado: "pendiente", estadoPago: "pendiente" }),
        pedido({ totalCentavos: 9900, estado: "cancelado", estadoPago: "pendiente" }),
        pedido({ creadoEn: "2026-10-01T15:00:00Z", totalCentavos: 100_000 }),
      ],
      { dias: 7, hoy },
    );
    expect(r.ventas).toBe(10_000);
    expect(r.pedidos).toBe(2);
    expect(r.ticketMedio).toBe(5000);
    expect(r.pendientes).toBe(1);
    expect(r.porCobrar).toBe(4000);
    expect(r.ventasPorDia).toHaveLength(7);
    expect(r.ventasPorDia.at(-1)).toEqual({ fecha: "2026-11-20", total: 10_000, pedidos: 2 });
  });

  it("ordena top productos y municipios", () => {
    const r = resumirPedidos(
      [
        pedido({
          municipio: "Cerro",
          items: [
            { productoId: "a", nombre: "Arroz", cantidad: 3, precioCentavos: 900 },
            { productoId: "c", nombre: "Combo", cantidad: 1, precioCentavos: 4900 },
          ],
        }),
        pedido({
          municipio: "Playa",
          items: [{ productoId: "a", nombre: "Arroz", cantidad: 2, precioCentavos: 900 }],
        }),
        pedido({
          municipio: "Playa",
          items: [{ productoId: null, nombre: "Producto borrado", cantidad: 1, precioCentavos: 100 }],
        }),
      ],
      { dias: 30, hoy, top: 2 },
    );
    expect(r.topProductos).toEqual([
      { nombre: "Arroz", unidades: 5, ingresos: 4500 },
      { nombre: "Combo", unidades: 1, ingresos: 4900 },
    ]);
    expect(r.porMunicipio.map((m) => m.municipio)).toEqual(["Playa", "Cerro"]);
  });

  it("sin pedidos devuelve ceros", () => {
    const r = resumirPedidos([], { dias: 7, hoy });
    expect(r.ticketMedio).toBe(0);
    expect(r.topProductos).toEqual([]);
  });
});
