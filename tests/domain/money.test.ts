import { describe, expect, it } from "vitest";
import { aCentavos, aDolares, convertir, formatearMoneda } from "@/domain/money";
import { ahorroCombo, calcularSubtotal, calcularTotales, totalesEn } from "@/domain/pricing";

describe("aCentavos", () => {
  it("convierte números y textos de la BD", () => {
    expect(aCentavos(49)).toBe(4900);
    expect(aCentavos("3.75")).toBe(375);
    expect(aCentavos(0)).toBe(0);
  });

  it("no arrastra errores de coma flotante", () => {
    expect(aCentavos(1.005)).toBe(101);
    expect(aCentavos(0.1 + 0.2)).toBe(30);
    expect(aCentavos(19.99)).toBe(1999);
  });

  it("rechaza valores no numéricos", () => {
    expect(() => aCentavos("abc")).toThrow(RangeError);
    expect(() => aCentavos(Number.NaN)).toThrow(RangeError);
  });

  it("vuelve a dólares", () => {
    expect(aDolares(4900)).toBe(49);
    expect(aDolares(375)).toBe(3.75);
  });
});

describe("convertir", () => {
  const tasas = { CUP: 410, EUR: 0.92 };

  it("USD → USD no cambia", () => {
    expect(convertir(4900, "USD", tasas)).toBe(4900);
  });

  it("USD → CUP y EUR con redondeo al centavo", () => {
    expect(convertir(4900, "CUP", tasas)).toBe(2_009_000);
    expect(convertir(4900, "EUR", tasas)).toBe(4508);
    expect(convertir(375, "EUR", tasas)).toBe(345);
  });

  it("devuelve null si falta la tasa o no es válida", () => {
    expect(convertir(100, "CUP", {})).toBeNull();
    expect(convertir(100, "EUR", { EUR: 0 })).toBeNull();
  });
});

describe("formatearMoneda", () => {
  it("USD y EUR con separador de miles y 2 decimales", () => {
    expect(formatearMoneda(4900, "USD")).toBe("$49.00");
    expect(formatearMoneda(125_050, "USD")).toBe("$1,250.50");
    expect(formatearMoneda(4508, "EUR")).toBe("€45.08");
    expect(formatearMoneda(5, "USD")).toBe("$0.05");
  });

  it("CUP sin centavos y con espacio de miles", () => {
    expect(formatearMoneda(2_009_000, "CUP")).toBe("20 090 CUP");
    expect(formatearMoneda(41_000, "CUP")).toBe("410 CUP");
  });

  it("importes negativos", () => {
    expect(formatearMoneda(-300, "USD")).toBe("-$3.00");
    expect(formatearMoneda(-41_000, "CUP")).toBe("-410 CUP");
  });
});

describe("totales", () => {
  const lineas = [
    { precioCentavos: 4900, cantidad: 1 },
    { precioCentavos: 375, cantidad: 2 },
  ];

  it("subtotal suma precio × cantidad", () => {
    expect(calcularSubtotal(lineas)).toBe(5650);
    expect(calcularSubtotal([])).toBe(0);
  });

  it("rechaza cantidades no enteras o negativas", () => {
    expect(() => calcularSubtotal([{ precioCentavos: 100, cantidad: 1.5 }])).toThrow(RangeError);
    expect(() => calcularSubtotal([{ precioCentavos: 100, cantidad: -1 }])).toThrow(RangeError);
  });

  it("total = subtotal + envío", () => {
    expect(calcularTotales(lineas, 300)).toEqual({ subtotal: 5650, envio: 300, total: 5950 });
  });

  it("sin productos no se cobra envío", () => {
    expect(calcularTotales([], 300)).toEqual({ subtotal: 0, envio: 0, total: 0 });
    expect(calcularTotales(lineas)).toEqual({ subtotal: 5650, envio: 0, total: 5650 });
  });

  it("expresa los totales en otra moneda", () => {
    const t = calcularTotales(lineas, 300);
    expect(totalesEn(t, "CUP", { CUP: 400 })).toEqual({
      subtotal: 2_260_000,
      envio: 120_000,
      total: 2_380_000,
    });
    expect(totalesEn(t, "EUR", {})).toBeNull();
  });
});

describe("ahorroCombo", () => {
  it("calcula el ahorro frente a comprar por separado", () => {
    const r = ahorroCombo(4900, [
      { precioCentavos: 2200, cantidad: 1 },
      { precioCentavos: 900, cantidad: 2 },
      { precioCentavos: 1000, cantidad: 1 },
    ]);
    expect(r).toEqual({ valorSeparado: 5000, ahorro: 100, porcentaje: 2 });
  });

  it("nunca devuelve ahorro negativo", () => {
    expect(ahorroCombo(6000, [{ precioCentavos: 5000, cantidad: 1 }]).ahorro).toBe(0);
    expect(ahorroCombo(100, []).porcentaje).toBe(0);
  });
});
