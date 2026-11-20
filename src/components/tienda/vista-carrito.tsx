"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { IconCart, IconImage, IconTrash, IconTruck } from "@/components/ui/icons";
import { sincronizarCarrito } from "@/domain/cart";
import { preciosActuales } from "@/server/actions/carrito";
import { useCarrito } from "./carrito-store";
import { SelectorCantidad } from "./carrito-ui";
import { Precio } from "./moneda";

/** Al abrir el carrito se revalidan precios y disponibilidad con el servidor. */
export function useSincronizarCarrito() {
  const { items, reemplazar } = useCarrito();
  const [cambios, setCambios] = useState<string[]>([]);
  const [sinConexion, setSinConexion] = useState(false);
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current || items.length === 0) return;
    hecho.current = true;
    preciosActuales(items.map((i) => i.productoId))
      .then((actuales) => {
        if (actuales === null) return setSinConexion(true);
        const r = sincronizarCarrito(items, actuales);
        if (r.cambios.length > 0) {
          reemplazar(r.items);
          setCambios(r.cambios);
        }
      })
      .catch(() => setSinConexion(true));
  }, [items, reemplazar]);

  return { cambios, sinConexion };
}

export function VistaCarrito() {
  const { items, subtotal, unidades, cambiar, quitar } = useCarrito();
  const { cambios, sinConexion } = useSincronizarCarrito();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (!montado) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icono={<IconCart />}
        titulo="Su carrito está vacío"
        accion={<ButtonLink href="/productos?tipo=combo">Ver combos</ButtonLink>}
      >
        Agregue combos o productos sueltos y los entregamos a su familia en La Habana.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-4">
        {cambios.length > 0 && (
          <Alert tono="aviso" titulo="Actualizamos su carrito">
            <ul className="list-disc pl-4">
              {cambios.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Alert>
        )}
        {sinConexion && (
          <Alert tono="info">
            No pudimos comprobar los precios ahora. Se confirmarán al hacer el pedido.
          </Alert>
        )}
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {items.map((i) => (
            <li key={i.productoId} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
              <Link
                href={`/p/${i.slug}`}
                className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:size-24"
              >
                {i.imagen ? (
                  <Image src={i.imagen} alt={i.nombre} fill sizes="96px" className="object-cover" />
                ) : (
                  <IconImage className="m-auto h-full text-slate-400" />
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/p/${i.slug}`}
                      className="hover:text-brand-700 line-clamp-2 font-semibold text-slate-900"
                    >
                      {i.nombre}
                    </Link>
                    {i.unidad && <p className="text-xs text-slate-500">{i.unidad}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => quitar(i.productoId)}
                    aria-label={`Quitar ${i.nombre} del carrito`}
                    className="hover:text-danger-600 grid size-9 shrink-0 place-items-center rounded-lg text-slate-400"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
                <div className="mt-auto flex items-end justify-between gap-2">
                  <SelectorCantidad
                    tamano="sm"
                    valor={i.cantidad}
                    onCambiar={(n) => cambiar(i.productoId, n)}
                    etiqueta={`Cantidad de ${i.nombre}`}
                  />
                  <Precio centavos={i.precioCentavos * i.cantidad} tamano="sm" />
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/productos" className="text-brand-700 inline-block text-sm font-semibold">
          ← Seguir comprando
        </Link>
      </div>

      <aside className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold text-slate-900">Resumen</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">
              Subtotal ({unidades} {unidades === 1 ? "unidad" : "unidades"})
            </dt>
            <dd>
              <Precio centavos={subtotal} tamano="sm" conCup={false} />
            </dd>
          </div>
          <div className="flex justify-between text-slate-600">
            <dt>Envío</dt>
            <dd>Según municipio</dd>
          </div>
        </dl>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="font-semibold">Total estimado</span>
          <Precio centavos={subtotal} tamano="lg" className="items-end" />
        </div>
        <ButtonLink href="/checkout" tamano="lg" className="w-full">
          Continuar con el pedido
        </ButtonLink>
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <IconTruck size={16} className="shrink-0" />
          Entregamos en los 15 municipios de La Habana. El envío se calcula en el siguiente paso.
        </p>
      </aside>
    </div>
  );
}
