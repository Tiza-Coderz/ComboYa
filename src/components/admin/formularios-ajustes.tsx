"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { ariaCampo, Field, Input } from "@/components/ui/field";
import { IconRefresh } from "@/components/ui/icons";
import type { EstadoForm } from "@/server/actions/admin-catalogo";
import { guardarConfiguracion, registrarTasa } from "@/server/actions/ajustes";
import { restablecerDemo, type EstadoReset } from "@/server/actions/demo";

const INICIAL: EstadoForm = { ok: false, mensaje: null, errores: {} };

export function FormTasa({ moneda, actual }: { moneda: "CUP" | "EUR"; actual: number | null }) {
  const [estado, accion, pendiente] = useActionState(registrarTasa, INICIAL);
  const id = `tasa-${moneda}`;
  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="moneda" value={moneda} />
      <Field
        id={id}
        label={`1 USD = ? ${moneda}`}
        error={estado.errores.tasa}
        ayuda={actual !== null ? `Vigente: ${actual} ${moneda}` : "Sin tasa registrada"}
      >
        <Input
          {...ariaCampo(id, estado.errores.tasa, true)}
          name="tasa"
          type="number"
          step={moneda === "CUP" ? "1" : "0.0001"}
          min="0"
          inputMode="decimal"
          defaultValue={actual ?? ""}
          required
        />
      </Field>
      <Button type="submit" tamano="sm" disabled={pendiente}>
        {pendiente ? <Spinner className="size-4" /> : null} Guardar tasa {moneda}
      </Button>
      {estado.mensaje && <Alert tono={estado.ok ? "exito" : "peligro"}>{estado.mensaje}</Alert>}
    </form>
  );
}

export function FormConfiguracion({
  inicial,
}: {
  inicial: {
    nombreNegocio: string;
    whatsappNegocio: string;
    emailContacto: string | null;
    horario: string | null;
  };
}) {
  const [estado, accion, pendiente] = useActionState(guardarConfiguracion, INICIAL);
  const e = estado.errores;
  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="nombre_negocio" label="Nombre del negocio" error={e.nombre_negocio}>
          <Input
            {...ariaCampo("nombre_negocio", e.nombre_negocio)}
            defaultValue={inicial.nombreNegocio}
            required
          />
        </Field>
        <Field
          id="whatsapp_negocio"
          label="WhatsApp del negocio"
          error={e.whatsapp_negocio}
          ayuda="Con código de país. Recibe los pedidos de la tienda."
        >
          <Input
            {...ariaCampo("whatsapp_negocio", e.whatsapp_negocio, true)}
            defaultValue={`+${inicial.whatsappNegocio}`}
            inputMode="tel"
            required
          />
        </Field>
        <Field id="email_contacto" label="Correo de contacto" opcional error={e.email_contacto}>
          <Input
            {...ariaCampo("email_contacto", e.email_contacto)}
            type="email"
            defaultValue={inicial.emailContacto ?? ""}
          />
        </Field>
        <Field id="horario" label="Horario de atención" opcional error={e.horario}>
          <Input {...ariaCampo("horario", e.horario)} defaultValue={inicial.horario ?? ""} />
        </Field>
      </div>
      <Button type="submit" tamano="sm" disabled={pendiente}>
        Guardar datos del negocio
      </Button>
      {estado.mensaje && <Alert tono={estado.ok ? "exito" : "peligro"}>{estado.mensaje}</Alert>}
    </form>
  );
}

export function BotonRestablecerDemo({ compacto = false }: { compacto?: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoReset>(restablecerDemo, {
    ok: false,
    mensaje: null,
  });
  return (
    <form
      action={accion}
      onSubmit={(ev) => {
        if (
          !confirm(
            "Se borrarán los cambios y se volverán a crear los datos de ejemplo. ¿Continuar?",
          )
        ) {
          ev.preventDefault();
        }
      }}
      className="space-y-2"
    >
      <Button
        type="submit"
        variante="secundario"
        tamano={compacto ? "sm" : "md"}
        className="w-full"
        disabled={pendiente}
      >
        {pendiente ? <Spinner className="size-4" /> : <IconRefresh size={16} />}
        {pendiente ? "Restableciendo…" : "Restablecer demo"}
      </Button>
      {estado.mensaje && <Alert tono={estado.ok ? "exito" : "aviso"}>{estado.mensaje}</Alert>}
    </form>
  );
}
