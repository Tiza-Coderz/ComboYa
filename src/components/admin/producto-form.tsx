"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { ariaCampo, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { aCentavos, formatearMoneda } from "@/domain/money";
import { ahorroCombo } from "@/domain/pricing";
import { slugify } from "@/domain/slug";
import { guardarProducto, type EstadoForm } from "@/server/actions/admin-catalogo";
import { SubirImagen } from "./subir-imagen";

interface Opcion {
  id: string;
  nombre: string;
  precioCentavos: number;
  unidad: string | null;
}

export interface ProductoInicial {
  id?: string;
  nombre: string;
  slug: string;
  categoriaId: string;
  descripcion: string;
  precioUsd: string;
  unidad: string;
  stock: string;
  activo: boolean;
  destacado: boolean;
  imagenRuta: string | null;
  imagen: string | null;
  items: { productoId: string; cantidad: number }[];
}

export function ProductoForm({
  tipo,
  inicial,
  categorias,
  productos,
}: {
  tipo: "producto" | "combo";
  inicial: ProductoInicial;
  categorias: { id: string; nombre: string }[];
  productos: Opcion[];
}) {
  const [estado, accion, guardando] = useActionState<EstadoForm, FormData>(guardarProducto, {
    ok: false,
    mensaje: null,
    errores: {},
  });
  const [nombre, setNombre] = useState(inicial.nombre);
  const [slug, setSlug] = useState(inicial.slug);
  const [slugManual, setSlugManual] = useState(Boolean(inicial.id));
  const [precio, setPrecio] = useState(inicial.precioUsd);
  const [items, setItems] = useState(inicial.items);
  const e = estado.errores;
  const volver = tipo === "combo" ? "/admin/combos" : "/admin/productos";

  const porId = new Map(productos.map((p) => [p.id, p]));
  const lineas = items
    .filter((i) => porId.has(i.productoId))
    .map((i) => ({
      precioCentavos: porId.get(i.productoId)!.precioCentavos,
      cantidad: i.cantidad,
    }));
  const precioCentavos = Number.isFinite(Number(precio)) ? aCentavos(Number(precio) || 0) : 0;
  const ahorro = ahorroCombo(precioCentavos, lineas);
  const unidades = items.reduce((n, i) => n + i.cantidad, 0);

  return (
    <form action={accion} className="space-y-6">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      {tipo === "combo" && (
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            items
              .filter((i) => i.productoId)
              .map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })),
          )}
        />
      )}

      {estado.mensaje && <Alert tono={estado.ok ? "exito" : "peligro"}>{estado.mensaje}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <Field id="nombre" label="Nombre" error={e.nombre}>
            <Input
              {...ariaCampo("nombre", e.nombre)}
              value={nombre}
              onChange={(ev) => {
                setNombre(ev.target.value);
                if (!slugManual) setSlug(slugify(ev.target.value));
              }}
              required
            />
          </Field>
          <Field
            id="slug"
            label="Identificador en la URL (slug)"
            error={e.slug}
            ayuda={`Se verá como /p/${slug || "..."}`}
          >
            <Input
              {...ariaCampo("slug", e.slug, true)}
              value={slug}
              onChange={(ev) => {
                setSlug(ev.target.value);
                setSlugManual(true);
              }}
              required
            />
          </Field>
          <Field id="descripcion" label="Descripción" error={e.descripcion}>
            <Textarea
              {...ariaCampo("descripcion", e.descripcion)}
              defaultValue={inicial.descripcion}
              rows={3}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="precio_usd" label="Precio (USD)" error={e.precio_usd}>
              <Input
                {...ariaCampo("precio_usd", e.precio_usd)}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={precio}
                onChange={(ev) => setPrecio(ev.target.value)}
                required
              />
            </Field>
            <Field id="unidad" label="Presentación" opcional error={e.unidad}>
              <Input
                {...ariaCampo("unidad", e.unidad)}
                defaultValue={inicial.unidad}
                placeholder={tipo === "combo" ? `${unidades} productos` : "paquete 1 kg"}
              />
            </Field>
            <Field
              id="stock"
              label="Existencias"
              opcional
              error={e.stock}
              ayuda="Vacío = sin control"
            >
              <Input
                {...ariaCampo("stock", e.stock, true)}
                type="number"
                min="0"
                defaultValue={inicial.stock}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <Field id="categoria_id" label="Categoría" error={e.categoria_id}>
            <Select
              {...ariaCampo("categoria_id", e.categoria_id)}
              defaultValue={inicial.categoriaId}
              required
            >
              <option value="">Elija…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-slate-800">Imagen</span>
            <SubirImagen
              nombre="imagen_url"
              inicial={inicial.imagenRuta}
              vistaPrevia={inicial.imagen}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Checkbox name="activo" label="Visible en la tienda" defaultChecked={inicial.activo} />
            <Checkbox
              name="destacado"
              label="Destacado en el inicio"
              defaultChecked={inicial.destacado}
            />
          </div>
        </div>
      </div>

      {tipo === "combo" && (
        <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Productos incluidos</h2>
            {lineas.length > 0 && (
              <p className="text-sm text-slate-600">
                Valor por separado: <strong>{formatearMoneda(ahorro.valorSeparado, "USD")}</strong>
                {ahorro.ahorro > 0 ? (
                  <span className="text-green-700">
                    {" "}
                    · el cliente ahorra {formatearMoneda(ahorro.ahorro, "USD")} ({ahorro.porcentaje}
                    %)
                  </span>
                ) : (
                  <span className="text-amber-700"> · el combo no ofrece ahorro</span>
                )}
              </p>
            )}
          </div>
          {e.items && <Alert tono="peligro">{e.items}</Alert>}
          <ul className="space-y-2">
            {items.map((it, idx) => (
              <li key={idx} className="flex gap-2">
                <label className="sr-only" htmlFor={`item-${idx}`}>
                  Producto {idx + 1}
                </label>
                <Select
                  id={`item-${idx}`}
                  value={it.productoId}
                  onChange={(ev) =>
                    setItems((xs) =>
                      xs.map((x, i) => (i === idx ? { ...x, productoId: ev.target.value } : x)),
                    )
                  }
                  className="flex-1"
                >
                  <option value="">Elija un producto…</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.unidad ? `(${p.unidad})` : ""} —{" "}
                      {formatearMoneda(p.precioCentavos, "USD")}
                    </option>
                  ))}
                </Select>
                <label className="sr-only" htmlFor={`cant-${idx}`}>
                  Cantidad
                </label>
                <Input
                  id={`cant-${idx}`}
                  type="number"
                  min={1}
                  max={99}
                  value={it.cantidad}
                  onChange={(ev) =>
                    setItems((xs) =>
                      xs.map((x, i) =>
                        i === idx
                          ? {
                              ...x,
                              cantidad: Math.max(1, Math.min(99, Number(ev.target.value) || 1)),
                            }
                          : x,
                      ),
                    )
                  }
                  className="w-20"
                />
                <button
                  type="button"
                  aria-label="Quitar producto"
                  onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))}
                  className="hover:text-danger-600 grid size-11 shrink-0 place-items-center rounded-xl text-slate-400 ring-1 ring-slate-200"
                >
                  <IconTrash size={18} />
                </button>
              </li>
            ))}
          </ul>
          <Button
            variante="secundario"
            tamano="sm"
            onClick={() => setItems((xs) => [...xs, { productoId: "", cantidad: 1 }])}
          >
            <IconPlus size={16} /> Añadir producto
          </Button>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" tamano="lg" disabled={guardando}>
          {guardando ? (
            <>
              <Spinner /> Guardando…
            </>
          ) : (
            "Guardar"
          )}
        </Button>
        <Link
          href={volver}
          className="grid h-12 place-items-center px-4 text-sm text-slate-600 hover:underline"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
