import { describe, expect, it } from "vitest";
import {
  categoriaSchema,
  comboItemsSchema,
  configuracionSchema,
  erroresPorCampo,
  esCarneValido,
  loginSchema,
  pedidoSchema,
  productoSchema,
  tasaSchema,
  zonaSchema,
  type PedidoInput,
} from "@/domain/schemas";

const ZONA = "8f14e45f-ceea-467f-a8f5-4b1c2b7b6d1e";
const PRODUCTO = "c9bf9e57-1685-4c89-bafb-ff5af830be8a";

const pedidoValido: PedidoInput = {
  comprador: {
    nombre: "Yanelis Rodríguez",
    pais: "Estados Unidos",
    telefono: "+1 (305) 555-0101",
    email: " Yanelis@Ejemplo.com ",
  },
  destinatario: {
    nombre: "Caridad Pérez",
    carne: "",
    telefono: "+53 5234 5678",
    zona_id: ZONA,
    direccion: "Calle 23 #1054 e/ 12 y 14, Vedado",
    referencia: "",
    mensaje: "¡Feliz cumpleaños, mami!",
  },
  metodo_pago: "enlace_pago",
  items: [{ producto_id: PRODUCTO, cantidad: 2 }],
};

describe("pedidoSchema", () => {
  it("acepta un pedido válido y normaliza los datos", () => {
    const r = pedidoSchema.parse(pedidoValido);
    expect(r.comprador.telefono).toBe("+13055550101");
    expect(r.comprador.email).toBe("yanelis@ejemplo.com");
    expect(r.destinatario.telefono).toBe("52345678");
    expect(r.destinatario.carne).toBeUndefined();
    expect(r.destinatario.referencia).toBeUndefined();
  });

  it("rechaza un teléfono cubano incorrecto con un mensaje claro", () => {
    const r = pedidoSchema.safeParse({
      ...pedidoValido,
      destinatario: { ...pedidoValido.destinatario, telefono: "123" },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(erroresPorCampo(r.error)["destinatario.telefono"]).toMatch(/8 dígitos/);
    }
  });

  it("valida el carné cuando se escribe", () => {
    const ok = pedidoSchema.safeParse({
      ...pedidoValido,
      destinatario: { ...pedidoValido.destinatario, carne: "85031512345" },
    });
    expect(ok.success).toBe(true);
    const mal = pedidoSchema.safeParse({
      ...pedidoValido,
      destinatario: { ...pedidoValido.destinatario, carne: "85133112345" },
    });
    expect(mal.success).toBe(false);
  });

  it("exige productos, método de pago y municipio", () => {
    const r = pedidoSchema.safeParse({
      ...pedidoValido,
      items: [],
      metodo_pago: "bitcoin",
      destinatario: { ...pedidoValido.destinatario, zona_id: "" },
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = erroresPorCampo(r.error);
      expect(e.items).toMatch(/vacío/);
      expect(e.metodo_pago).toBeDefined();
      expect(e["destinatario.zona_id"]).toMatch(/municipio/);
    }
  });

  it("limita la cantidad por producto", () => {
    const r = pedidoSchema.safeParse({
      ...pedidoValido,
      items: [{ producto_id: PRODUCTO, cantidad: 51 }],
    });
    expect(r.success).toBe(false);
  });
});

describe("esCarneValido", () => {
  it("comprueba longitud y fecha", () => {
    expect(esCarneValido("90010112345")).toBe(true);
    expect(esCarneValido("9001011234")).toBe(false);
    expect(esCarneValido("90000112345")).toBe(false);
    expect(esCarneValido("90013212345")).toBe(false);
  });
});

describe("formularios de administración", () => {
  it("producto: convierte casillas, precio y stock vacío", () => {
    const r = productoSchema.parse({
      nombre: "Arroz",
      slug: "arroz-10lb",
      categoria_id: ZONA,
      descripcion: "",
      precio_usd: "9.005",
      unidad: "saco 10 lb",
      stock: "",
      activo: "on",
      destacado: undefined,
      imagen_url: "",
    });
    expect(r.precio_usd).toBe(9.01);
    expect(r.stock).toBeNull();
    expect(r.activo).toBe(true);
    expect(r.destacado).toBe(false);
    expect(r.imagen_url).toBeUndefined();
  });

  it("producto: slug inválido y precio negativo", () => {
    const r = productoSchema.safeParse({
      nombre: "X",
      slug: "Arroz Blanco",
      categoria_id: ZONA,
      precio_usd: "-1",
      stock: "3",
    });
    expect(r.success).toBe(false);
  });

  it("combo: sin repetidos y con al menos un producto", () => {
    expect(comboItemsSchema.safeParse([]).success).toBe(false);
    expect(
      comboItemsSchema.safeParse([
        { producto_id: PRODUCTO, cantidad: 1 },
        { producto_id: PRODUCTO, cantidad: 2 },
      ]).success,
    ).toBe(false);
    expect(comboItemsSchema.safeParse([{ producto_id: PRODUCTO, cantidad: "2" }]).success).toBe(
      true,
    );
  });

  it("zona: días máximos ≥ mínimos", () => {
    const base = { municipio: "Playa", costo_usd: "3", dias_min: "2", activa: "on" };
    expect(zonaSchema.safeParse({ ...base, dias_max: "1" }).success).toBe(false);
    expect(zonaSchema.parse({ ...base, dias_max: "3" }).activa).toBe(true);
  });

  it("tasa: positiva", () => {
    expect(tasaSchema.parse({ moneda: "CUP", tasa: "415" }).tasa).toBe(415);
    expect(tasaSchema.safeParse({ moneda: "CUP", tasa: "0" }).success).toBe(false);
    expect(tasaSchema.safeParse({ moneda: "USD", tasa: "1" }).success).toBe(false);
  });

  it("configuración: limpia el WhatsApp y acepta email vacío", () => {
    const r = configuracionSchema.parse({
      nombre_negocio: "ComboYa",
      whatsapp_negocio: "+53 5555 5555",
      email_contacto: "",
      horario: "",
    });
    expect(r.whatsapp_negocio).toBe("5355555555");
    expect(r.email_contacto).toBeUndefined();
    expect(
      configuracionSchema.safeParse({ ...r, email_contacto: "no-es-correo" }).success,
    ).toBe(false);
  });

  it("categoría y login", () => {
    expect(categoriaSchema.parse({ nombre: "Aseo", slug: "aseo", orden: "4" }).orden).toBe(4);
    expect(loginSchema.safeParse({ email: "admin@demo.cu", password: "demo1234" }).success).toBe(
      true,
    );
    expect(loginSchema.safeParse({ email: "admin", password: "1" }).success).toBe(false);
  });
});
