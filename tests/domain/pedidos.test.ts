import { describe, expect, it } from "vitest";
import { esCodigoValido, normalizarCodigo } from "@/domain/order-code";
import {
  esEstadoFinal,
  esEstadoPago,
  esEstadoPedido,
  pasoActual,
  puedeCambiarEstado,
  puedeCambiarPago,
  siguientesEstados,
} from "@/domain/order-status";
import {
  formatearTelefonoCuba,
  limpiarTelefono,
  normalizarTelefonoCuba,
  telefonoParaWhatsApp,
} from "@/domain/phone";
import { slugify } from "@/domain/slug";

describe("código de pedido", () => {
  it("valida el formato CY-1234", () => {
    expect(esCodigoValido("CY-1234")).toBe(true);
    expect(esCodigoValido("CY-123456")).toBe(true);
    expect(esCodigoValido("CY-123")).toBe(false);
    expect(esCodigoValido("cy-1234")).toBe(false);
  });

  it("normaliza lo que escribe el cliente", () => {
    expect(normalizarCodigo(" cy-4821 ")).toBe("CY-4821");
    expect(normalizarCodigo("CY 4821")).toBe("CY-4821");
    expect(normalizarCodigo("4821")).toBe("CY-4821");
    expect(normalizarCodigo("cy4821")).toBe("CY-4821");
    expect(normalizarCodigo("hola")).toBeNull();
    expect(normalizarCodigo("CY-12")).toBeNull();
  });
});

describe("máquina de estados del pedido", () => {
  it("sigue el flujo normal paso a paso", () => {
    expect(puedeCambiarEstado("pendiente", "confirmado")).toBe(true);
    expect(puedeCambiarEstado("confirmado", "en_preparacion")).toBe(true);
    expect(puedeCambiarEstado("en_preparacion", "en_camino")).toBe(true);
    expect(puedeCambiarEstado("en_camino", "entregado")).toBe(true);
  });

  it("no permite saltos ni retrocesos", () => {
    expect(puedeCambiarEstado("pendiente", "entregado")).toBe(false);
    expect(puedeCambiarEstado("en_camino", "confirmado")).toBe(false);
  });

  it("se puede cancelar hasta antes de entregar", () => {
    expect(puedeCambiarEstado("en_camino", "cancelado")).toBe(true);
    expect(puedeCambiarEstado("entregado", "cancelado")).toBe(false);
  });

  it("entregado y cancelado son finales", () => {
    expect(esEstadoFinal("entregado")).toBe(true);
    expect(esEstadoFinal("cancelado")).toBe(true);
    expect(esEstadoFinal("pendiente")).toBe(false);
    expect(siguientesEstados("cancelado")).toEqual([]);
  });

  it("pagos: pendiente → pagado → reembolsado, con opción de deshacer", () => {
    expect(puedeCambiarPago("pendiente", "pagado")).toBe(true);
    expect(puedeCambiarPago("pagado", "pendiente")).toBe(true);
    expect(puedeCambiarPago("pagado", "reembolsado")).toBe(true);
    expect(puedeCambiarPago("pendiente", "reembolsado")).toBe(false);
    expect(puedeCambiarPago("reembolsado", "pagado")).toBe(false);
  });

  it("paso de la línea de tiempo", () => {
    expect(pasoActual("pendiente")).toBe(0);
    expect(pasoActual("entregado")).toBe(4);
    expect(pasoActual("cancelado")).toBe(-1);
  });

  it("guardas de tipo", () => {
    expect(esEstadoPedido("en_camino")).toBe(true);
    expect(esEstadoPedido("perdido")).toBe(false);
    expect(esEstadoPago("pagado")).toBe(true);
    expect(esEstadoPago("fiado")).toBe(false);
  });
});

describe("teléfonos", () => {
  it("limpia separadores y conserva el +", () => {
    expect(limpiarTelefono(" +1 (305) 555-0101 ")).toBe("+13055550101");
  });

  it("normaliza números cubanos a 8 dígitos", () => {
    expect(normalizarTelefonoCuba("5234 5678")).toBe("52345678");
    expect(normalizarTelefonoCuba("+53 5 234 5678")).toBe("52345678");
    expect(normalizarTelefonoCuba("0053 52345678")).toBe("52345678");
    expect(normalizarTelefonoCuba("78321234")).toBe("78321234");
    expect(normalizarTelefonoCuba("1234")).toBeNull();
    expect(normalizarTelefonoCuba("32345678")).toBeNull();
  });

  it("prepara el número para wa.me", () => {
    expect(telefonoParaWhatsApp("52345678")).toBe("5352345678");
    expect(telefonoParaWhatsApp("+1 305 555 0101")).toBe("13055550101");
  });

  it("formatea para mostrar", () => {
    expect(formatearTelefonoCuba("52345678")).toBe("5234 5678");
    expect(formatearTelefonoCuba("+13055550101")).toBe("+13055550101");
  });
});

describe("slugify", () => {
  it("quita tildes, eñes y símbolos", () => {
    expect(slugify("Café molido Serrano 250 g")).toBe("cafe-molido-serrano-250-g");
    expect(slugify("  Combo Cumpleaños!! ")).toBe("combo-cumpleanos");
    expect(slugify("Néctar de mango (1 L)")).toBe("nectar-de-mango-1-l");
  });
});
