"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  agregarAlCarrito,
  cambiarCantidad,
  contarUnidades,
  parsearCarrito,
  quitarDelCarrito,
  subtotalCarrito,
  type ItemCarrito,
  type ProductoCarrito,
} from "@/domain/cart";

/**
 * Carrito persistente en localStorage. La lógica vive en src/domain/cart.ts;
 * aquí solo se guarda, se lee y se avisa a los componentes (también entre
 * pestañas, con el evento "storage").
 */
const CLAVE = "comboya:carrito";
const VACIO: ItemCarrito[] = [];
const oyentes = new Set<() => void>();
let cache: ItemCarrito[] | null = null;

function leer(): ItemCarrito[] {
  if (cache) return cache;
  try {
    cache = parsearCarrito(localStorage.getItem(CLAVE));
  } catch {
    cache = [];
  }
  return cache;
}

function guardar(items: ItemCarrito[]) {
  cache = items;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(items));
  } catch {
    /* almacenamiento lleno o bloqueado: el carrito vive solo en memoria */
  }
  oyentes.forEach((cb) => cb());
}

function suscribir(cb: () => void) {
  oyentes.add(cb);
  const alCambiar = (e: StorageEvent) => {
    if (e.key === CLAVE || e.key === null) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", alCambiar);
  return () => {
    oyentes.delete(cb);
    window.removeEventListener("storage", alCambiar);
  };
}

// ─── Avisos breves ("Agregado al carrito") ──────────────────────────────────
let aviso: { id: number; texto: string } | null = null;
const oyentesAviso = new Set<() => void>();
let temporizador: ReturnType<typeof setTimeout> | undefined;

export function mostrarAviso(texto: string) {
  aviso = { id: Date.now(), texto };
  oyentesAviso.forEach((cb) => cb());
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    aviso = null;
    oyentesAviso.forEach((cb) => cb());
  }, 2600);
}

export function useAviso() {
  return useSyncExternalStore(
    (cb) => {
      oyentesAviso.add(cb);
      return () => oyentesAviso.delete(cb);
    },
    () => aviso,
    () => null,
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useCarrito() {
  const items = useSyncExternalStore(suscribir, leer, () => VACIO);

  const agregar = useCallback((producto: ProductoCarrito, cantidad = 1) => {
    const r = agregarAlCarrito(leer(), producto, cantidad);
    guardar(r.items);
    mostrarAviso(r.aviso ?? `«${producto.nombre}» agregado al carrito`);
  }, []);

  const cambiar = useCallback((productoId: string, cantidad: number) => {
    guardar(cambiarCantidad(leer(), productoId, cantidad));
  }, []);

  const quitar = useCallback((productoId: string) => {
    guardar(quitarDelCarrito(leer(), productoId));
  }, []);

  const reemplazar = useCallback((nuevos: ItemCarrito[]) => guardar(nuevos), []);
  const vaciar = useCallback(() => guardar([]), []);

  return {
    items,
    unidades: contarUnidades(items),
    subtotal: subtotalCarrito(items),
    agregar,
    cambiar,
    quitar,
    reemplazar,
    vaciar,
  };
}
