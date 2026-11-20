"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton, Spinner } from "@/components/ui/feedback";
import { ariaCampo, Field, Input, Select, Textarea } from "@/components/ui/field";
import { IconCart, IconCheck, IconShield, IconWhatsApp } from "@/components/ui/icons";
import { calcularTotales } from "@/domain/pricing";
import { ETIQUETA_METODO, METODOS_PAGO, type MetodoPago } from "@/domain/order-status";
import { compradorSchema, erroresPorCampo, pedidoSchema } from "@/domain/schemas";
import { formatearMoneda } from "@/domain/money";
import { cn } from "@/lib/utils";
import { confirmarPedido } from "@/server/actions/pedidos";
import type { Zona } from "@/server/types";
import { useCarrito } from "./carrito-store";
import { Precio } from "./moneda";
import { useSincronizarCarrito } from "./vista-carrito";

const PAISES = [
  "Estados Unidos",
  "España",
  "México",
  "Canadá",
  "Italia",
  "Alemania",
  "Chile",
  "Uruguay",
  "Panamá",
  "Brasil",
  "Francia",
  "Rusia",
];

const CLAVE_COMPRADOR = "comboya:comprador";

interface Comprador {
  nombre: string;
  pais: string;
  telefono: string;
  email: string;
}
interface Destinatario {
  nombre: string;
  carne: string;
  telefono: string;
  zona_id: string;
  direccion: string;
  referencia: string;
  mensaje: string;
}

const COMPRADOR_VACIO: Comprador = { nombre: "", pais: "", telefono: "", email: "" };
const DEST_VACIO: Destinatario = {
  nombre: "",
  carne: "",
  telefono: "",
  zona_id: "",
  direccion: "",
  referencia: "",
  mensaje: "",
};

function Pasos({ paso }: { paso: 1 | 2 }) {
  const pasos = ["Sus datos", "Quién recibe"];
  return (
    <ol className="flex items-center gap-3 text-sm" aria-label="Pasos del pedido">
      {pasos.map((p, i) => {
        const n = (i + 1) as 1 | 2;
        const hecho = n < paso;
        const actual = n === paso;
        return (
          <li
            key={p}
            className="flex items-center gap-2"
            aria-current={actual ? "step" : undefined}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full font-bold",
                hecho && "bg-green-600 text-white",
                actual && "bg-brand-700 text-white",
                !hecho && !actual && "bg-slate-200 text-slate-600",
              )}
            >
              {hecho ? <IconCheck size={16} /> : n}
            </span>
            <span className={cn("font-medium", actual ? "text-slate-900" : "text-slate-500")}>
              {p}
            </span>
            {i < pasos.length - 1 && <span className="mx-1 h-px w-8 bg-slate-300" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function Checkout({ zonas }: { zonas: Zona[] }) {
  const router = useRouter();
  const { items, vaciar } = useCarrito();
  const { cambios } = useSincronizarCarrito();
  const [montado, setMontado] = useState(false);
  const [paso, setPaso] = useState<1 | 2>(1);
  const [comprador, setComprador] = useState<Comprador>(COMPRADOR_VACIO);
  const [dest, setDest] = useState<Destinatario>(DEST_VACIO);
  const [metodo, setMetodo] = useState<MetodoPago>("enlace_pago");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  // Datos del comprador recordados de una compra anterior (solo en este navegador).
  useEffect(() => {
    setMontado(true);
    try {
      const guardado = localStorage.getItem(CLAVE_COMPRADOR);
      if (guardado) setComprador({ ...COMPRADOR_VACIO, ...(JSON.parse(guardado) as Comprador) });
    } catch {
      /* sin datos previos */
    }
  }, []);

  const zona = zonas.find((z) => z.id === dest.zona_id);
  const totales = calcularTotales(items, zona?.costoCentavos ?? 0);

  if (!montado) return <Skeleton className="h-96" />;

  if (items.length === 0) {
    return (
      <EmptyState
        icono={<IconCart />}
        titulo="No hay productos en su carrito"
        accion={<ButtonLink href="/productos?tipo=combo">Ver combos</ButtonLink>}
      >
        Agregue algún combo o producto para hacer su pedido.
      </EmptyState>
    );
  }

  const campoC = (k: keyof Comprador) => ({
    ...ariaCampo(`comprador.${k}`, errores[`comprador.${k}`]),
    value: comprador[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setComprador((c) => ({ ...c, [k]: e.target.value })),
  });
  const campoD = (k: keyof Destinatario) => ({
    ...ariaCampo(`destinatario.${k}`, errores[`destinatario.${k}`]),
    value: dest[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setDest((d) => ({ ...d, [k]: e.target.value })),
  });

  function enfocarPrimerError(errs: Record<string, string>) {
    const primero = Object.keys(errs)[0];
    if (primero) document.getElementById(primero)?.focus();
  }

  function continuar(e: React.FormEvent) {
    e.preventDefault();
    const r = compradorSchema.safeParse(comprador);
    if (!r.success) {
      const errs = Object.fromEntries(
        Object.entries(erroresPorCampo(r.error)).map(([k, v]) => [`comprador.${k}`, v]),
      );
      setErrores(errs);
      enfocarPrimerError(errs);
      return;
    }
    setErrores({});
    setPaso(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    const datos = {
      comprador,
      destinatario: dest,
      metodo_pago: metodo,
      items: items.map((i) => ({ producto_id: i.productoId, cantidad: i.cantidad })),
    };
    const r = pedidoSchema.safeParse(datos);
    if (!r.success) {
      const errs = erroresPorCampo(r.error);
      setErrores(errs);
      if (Object.keys(errs).some((k) => k.startsWith("comprador."))) setPaso(1);
      setTimeout(() => enfocarPrimerError(errs), 0);
      return;
    }
    setErrores({});
    startTransition(async () => {
      const res = await confirmarPedido(datos);
      if (!res.ok) {
        setMensaje(res.mensaje);
        if (res.errores) setErrores(res.errores);
        return;
      }
      try {
        localStorage.setItem(CLAVE_COMPRADOR, JSON.stringify(comprador));
        sessionStorage.setItem(`comboya:wa:${res.codigo}`, res.whatsapp);
      } catch {
        /* sin almacenamiento */
      }
      vaciar();
      // Abre WhatsApp con el resumen; si el navegador lo bloquea, la página de
      // seguimiento muestra el botón para enviarlo.
      window.open(res.whatsapp, "_blank", "noopener");
      router.push(`/seguimiento/${res.codigo}?nuevo=1`);
    });
  }

  const resumen = (
    <aside className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 lg:sticky lg:top-24">
      <h2 className="font-bold text-slate-900">Su pedido</h2>
      <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
        {items.map((i) => (
          <li key={i.productoId} className="flex justify-between gap-3">
            <span className="text-slate-700">
              {i.cantidad} × {i.nombre}
            </span>
            <span className="font-medium whitespace-nowrap tabular-nums">
              {formatearMoneda(i.precioCentavos * i.cantidad, "USD")}
            </span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 border-t border-slate-100 pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-600">Subtotal</dt>
          <dd className="tabular-nums">{formatearMoneda(totales.subtotal, "USD")}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-600">Envío {zona ? `a ${zona.municipio}` : ""}</dt>
          <dd className="tabular-nums">
            {zona ? formatearMoneda(totales.envio, "USD") : "Elija municipio"}
          </dd>
        </div>
      </dl>
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="font-semibold">Total</span>
        <Precio centavos={totales.total} tamano="lg" className="items-end" />
      </div>
      <p className="flex gap-2 text-xs text-slate-500">
        <IconShield size={16} className="shrink-0" />
        El precio final se confirma en el servidor con la tarifa vigente.
      </p>
    </aside>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-5">
        <Pasos paso={paso} />
        {cambios.length > 0 && (
          <Alert tono="aviso" titulo="Actualizamos su carrito">
            {cambios.join(" ")}
          </Alert>
        )}
        {mensaje && <Alert tono="peligro">{mensaje}</Alert>}

        {paso === 1 ? (
          <form
            onSubmit={continuar}
            noValidate
            className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">1. Sus datos</h2>
              <p className="text-sm text-slate-600">
                Le escribiremos para confirmar el pago y avisarle de la entrega.
              </p>
            </div>
            <Field
              id="comprador.nombre"
              label="Nombre y apellidos"
              error={errores["comprador.nombre"]}
            >
              <Input
                {...campoC("nombre")}
                autoComplete="name"
                placeholder="Ej. Yanelis Rodríguez"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="comprador.pais" label="País donde vive" error={errores["comprador.pais"]}>
                <Input {...campoC("pais")} list="paises" autoComplete="country-name" />
              </Field>
              <datalist id="paises">
                {PAISES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              <Field
                id="comprador.telefono"
                label="Teléfono / WhatsApp"
                error={errores["comprador.telefono"]}
                ayuda="Con el código del país, ej. +1 305 555 0101"
              >
                <Input {...campoC("telefono")} type="tel" autoComplete="tel" inputMode="tel" />
              </Field>
            </div>
            <Field
              id="comprador.email"
              label="Correo electrónico"
              error={errores["comprador.email"]}
            >
              <Input {...campoC("email")} type="email" autoComplete="email" inputMode="email" />
            </Field>
            <Button type="submit" tamano="lg" className="w-full sm:w-auto">
              Continuar
            </Button>
          </form>
        ) : (
          <form
            onSubmit={confirmar}
            noValidate
            className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">2. ¿Quién recibe en Cuba?</h2>
                <p className="text-sm text-slate-600">
                  Compra: {comprador.nombre} ·{" "}
                  <button
                    type="button"
                    className="text-brand-700 font-semibold underline"
                    onClick={() => setPaso(1)}
                  >
                    Cambiar
                  </button>
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="destinatario.nombre"
                label="Nombre de quien recibe"
                error={errores["destinatario.nombre"]}
              >
                <Input {...campoD("nombre")} placeholder="Ej. Caridad Pérez Linares" />
              </Field>
              <Field
                id="destinatario.telefono"
                label="Teléfono en Cuba"
                error={errores["destinatario.telefono"]}
                ayuda="Móvil o fijo, 8 dígitos"
              >
                <Input {...campoD("telefono")} type="tel" inputMode="tel" placeholder="5234 5678" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="destinatario.zona_id"
                label="Municipio (La Habana)"
                error={errores["destinatario.zona_id"]}
              >
                <Select {...campoD("zona_id")}>
                  <option value="">Elija el municipio…</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.municipio} — {formatearMoneda(z.costoCentavos, "USD")} ({z.diasMin}–
                      {z.diasMax} días)
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                id="destinatario.carne"
                label="Carné de identidad"
                opcional
                error={errores["destinatario.carne"]}
                ayuda="Agiliza la entrega"
              >
                <Input {...campoD("carne")} inputMode="numeric" maxLength={11} />
              </Field>
            </div>
            <Field
              id="destinatario.direccion"
              label="Dirección"
              error={errores["destinatario.direccion"]}
            >
              <Input {...campoD("direccion")} placeholder="Calle 23 #1054 e/ 12 y 14, apto 3" />
            </Field>
            <Field
              id="destinatario.referencia"
              label="Referencia para encontrar la casa"
              opcional
              error={errores["destinatario.referencia"]}
            >
              <Input
                {...campoD("referencia")}
                placeholder="Casa de rejas verdes, al lado de la bodega"
              />
            </Field>
            <Field
              id="destinatario.mensaje"
              label="Mensaje para su familia"
              opcional
              error={errores["destinatario.mensaje"]}
              ayuda="Lo entregamos junto con el pedido"
            >
              <Textarea {...campoD("mensaje")} maxLength={500} rows={3} />
            </Field>

            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-slate-800">
                ¿Cómo desea pagar?
              </legend>
              {METODOS_PAGO.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xl p-3 ring-1",
                    metodo === m
                      ? "bg-brand-50 ring-brand-500"
                      : "ring-slate-200 hover:bg-slate-50",
                  )}
                >
                  <input
                    type="radio"
                    name="metodo_pago"
                    value={m}
                    checked={metodo === m}
                    onChange={() => setMetodo(m)}
                    className="accent-brand-700 mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{ETIQUETA_METODO[m]}</span>
                    <span className="block text-xs text-slate-600">
                      {m === "enlace_pago"
                        ? "Le enviamos un enlace de pago por WhatsApp o correo. Preparamos el pedido al confirmarse el pago."
                        : "Su familiar paga en dólares en efectivo al recibir el pedido."}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                variante="secundario"
                tamano="lg"
                onClick={() => setPaso(1)}
                disabled={enviando}
              >
                Atrás
              </Button>
              <Button type="submit" tamano="lg" className="flex-1" disabled={enviando}>
                {enviando ? (
                  <>
                    <Spinner /> Registrando su pedido…
                  </>
                ) : (
                  <>
                    <IconWhatsApp /> Confirmar pedido · {formatearMoneda(totales.total, "USD")}
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Al confirmar se abrirá WhatsApp con el resumen de su pedido para enviárnoslo.
            </p>
          </form>
        )}
      </div>
      {resumen}
    </div>
  );
}
