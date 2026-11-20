import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductoForm, type ProductoInicial } from "@/components/admin/producto-form";
import { Encabezado } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconTrash } from "@/components/ui/icons";
import { aDolares } from "@/domain/money";
import { eliminarProducto } from "@/server/actions/admin-catalogo";
import { requireAdmin } from "@/server/auth";
import {
  listarCategoriasAdmin,
  listarProductosAdmin,
  obtenerProductoAdmin,
} from "@/server/repositories/admin-catalogo";

export const metadata: Metadata = { title: "Editar producto" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string }>;
};

export default async function EditarProductoPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const nuevo = id === "nuevo";
  if (!nuevo && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();

  const [producto, categorias, simples] = await Promise.all([
    nuevo ? null : obtenerProductoAdmin(supabase, id),
    listarCategoriasAdmin(supabase),
    listarProductosAdmin(supabase, { tipo: "producto" }),
  ]);
  if (!nuevo && !producto) notFound();

  const tipo = producto?.tipo ?? (sp.tipo === "combo" ? "combo" : "producto");
  const catCombos = categorias.find((c) => c.slug === "combos")?.id ?? "";
  const inicial: ProductoInicial = producto
    ? {
        id: producto.id,
        nombre: producto.nombre,
        slug: producto.slug,
        categoriaId: producto.categoriaId,
        descripcion: producto.descripcion,
        precioUsd: aDolares(producto.precioCentavos).toFixed(2),
        unidad: producto.unidad ?? "",
        stock: producto.stock === null ? "" : String(producto.stock),
        activo: producto.activo,
        destacado: producto.destacado,
        imagenRuta: producto.imagenRuta,
        imagen: producto.imagen,
        items: producto.items.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
      }
    : {
        nombre: "",
        slug: "",
        categoriaId: tipo === "combo" ? catCombos : "",
        descripcion: "",
        precioUsd: "",
        unidad: "",
        stock: "",
        activo: true,
        destacado: false,
        imagenRuta: null,
        imagen: null,
        items: tipo === "combo" ? [{ productoId: "", cantidad: 1 }] : [],
      };
  const volver = tipo === "combo" ? "/admin/combos" : "/admin/productos";

  return (
    <>
      <Link
        href={volver}
        className="text-brand-700 inline-flex items-center gap-1 text-sm font-medium"
      >
        <IconChevronLeft size={16} /> {tipo === "combo" ? "Combos" : "Productos"}
      </Link>
      <Encabezado
        titulo={
          nuevo
            ? tipo === "combo"
              ? "Nuevo combo"
              : "Nuevo producto"
            : `Editar: ${producto!.nombre}`
        }
        acciones={
          producto && (
            <Link
              href={`/p/${producto.slug}`}
              target="_blank"
              className="text-brand-700 text-sm hover:underline"
            >
              Ver en la tienda ↗
            </Link>
          )
        }
      />
      <ProductoForm
        tipo={tipo}
        inicial={inicial}
        categorias={categorias}
        productos={simples.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precioCentavos: p.precioCentavos,
          unidad: p.unidad,
        }))}
      />
      {producto && (
        <form action={eliminarProducto} className="border-t border-slate-200 pt-6">
          <input type="hidden" name="id" value={producto.id} />
          <input type="hidden" name="tipo" value={tipo} />
          <p className="mb-2 text-sm text-slate-600">
            Los pedidos anteriores conservan el nombre y el precio. Si el producto está dentro de un
            combo, no se podrá borrar: desactívelo.
          </p>
          <Button type="submit" variante="peligro" tamano="sm">
            <IconTrash size={16} /> Eliminar
          </Button>
        </form>
      )}
    </>
  );
}
