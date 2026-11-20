import { describe, expect, it } from "vitest";
import {
  agregarAlCarrito,
  cambiarCantidad,
  contarUnidades,
  MAX_CANTIDAD,
  MAX_DISTINTOS,
  parsearCarrito,
  quitarDelCarrito,
  sincronizarCarrito,
  subtotalCarrito,
  type ProductoCarrito,
} from "@/domain/cart";

const arroz: ProductoCarrito = {
  productoId: "p-arroz",
  slug: "arroz-10lb",
  nombre: "Arroz",
  tipo: "producto",
  precioCentavos: 900,
  imagen: null,
  unidad: "saco 10 lb",
};
const combo: ProductoCarrito = {
  productoId: "p-combo",
  slug: "combo-familiar-basico",
  nombre: "Combo Familiar Básico",
  tipo: "combo",
  precioCentavos: 4900,
  imagen: "combos/combo-familiar-basico.webp",
  unidad: "9 productos",
};

describe("carrito", () => {
  it("agrega y acumula cantidades", () => {
    let r = agregarAlCarrito([], arroz);
    r = agregarAlCarrito(r.items, arroz, 2);
    r = agregarAlCarrito(r.items, combo);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]?.cantidad).toBe(3);
    expect(contarUnidades(r.items)).toBe(4);
    expect(subtotalCarrito(r.items)).toBe(3 * 900 + 4900);
  });

  it("limita a 50 unidades por producto y avisa", () => {
    const r1 = agregarAlCarrito([], arroz, 49);
    const r2 = agregarAlCarrito(r1.items, arroz, 5);
    expect(r2.items[0]?.cantidad).toBe(MAX_CANTIDAD);
    expect(r2.aviso).toMatch(/50/);
  });

  it("limita los productos distintos", () => {
    const llenos = Array.from({ length: MAX_DISTINTOS }, (_, i) => ({
      ...arroz,
      productoId: `p-${i}`,
      cantidad: 1,
    }));
    const r = agregarAlCarrito(llenos, combo);
    expect(r.items).toHaveLength(MAX_DISTINTOS);
    expect(r.aviso).toMatch(/30/);
  });

  it("ignora cantidades nulas al agregar", () => {
    expect(agregarAlCarrito([], arroz, 0).items).toEqual([]);
  });

  it("cambia cantidades y quita con 0", () => {
    const { items } = agregarAlCarrito([], arroz, 2);
    expect(cambiarCantidad(items, "p-arroz", 7)[0]?.cantidad).toBe(7);
    expect(cambiarCantidad(items, "p-arroz", 999)[0]?.cantidad).toBe(MAX_CANTIDAD);
    expect(cambiarCantidad(items, "p-arroz", 0)).toEqual([]);
    expect(quitarDelCarrito(items, "p-arroz")).toEqual([]);
  });
});

describe("parsearCarrito", () => {
  it("recupera un carrito guardado", () => {
    const { items } = agregarAlCarrito([], combo, 2);
    expect(parsearCarrito(JSON.stringify(items))).toEqual(items);
  });

  it("tolera datos corruptos, duplicados y formatos viejos", () => {
    expect(parsearCarrito("{no es json")).toEqual([]);
    expect(parsearCarrito({ a: 1 })).toEqual([]);
    expect(parsearCarrito(null)).toEqual([]);
    const item = { ...arroz, cantidad: 1 };
    expect(parsearCarrito([item, item, { productoId: "x" }, { ...item, cantidad: 0 }])).toEqual([
      item,
    ]);
  });
});

describe("sincronizarCarrito", () => {
  it("actualiza precios y retira productos no disponibles", () => {
    const items = [
      { ...arroz, cantidad: 1 },
      { ...combo, cantidad: 1 },
    ];
    const r = sincronizarCarrito(items, [
      { id: "p-arroz", nombre: "Arroz", precioCentavos: 950, disponible: true },
      { id: "p-combo", nombre: "Combo Familiar Básico", precioCentavos: 4900, disponible: false },
    ]);
    expect(r.items).toEqual([{ ...arroz, cantidad: 1, precioCentavos: 950 }]);
    expect(r.cambios).toHaveLength(2);
  });

  it("sin cambios no genera mensajes", () => {
    const items = [{ ...arroz, cantidad: 2 }];
    const r = sincronizarCarrito(items, [
      { id: "p-arroz", nombre: "Arroz", precioCentavos: 900, disponible: true },
    ]);
    expect(r.cambios).toEqual([]);
    expect(r.items).toEqual(items);
  });
});
