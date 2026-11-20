"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { iniciarSesion, type EstadoLogin } from "@/server/actions/auth";

export function LoginForm({ demo }: { demo: { email: string; password: string } | null }) {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, {
    error: null,
  });
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      {demo && (
        <div className="rounded-xl bg-amber-50 p-4 text-sm ring-1 ring-amber-200">
          <p className="font-semibold text-amber-900">Credenciales de la demo</p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-amber-900">
            <dt>Correo:</dt>
            <dd className="font-mono">{demo.email}</dd>
            <dt>Contraseña:</dt>
            <dd className="font-mono">{demo.password}</dd>
          </dl>
          <button
            type="button"
            className="mt-2 font-semibold text-amber-800 underline"
            onClick={() => {
              if (emailRef.current) emailRef.current.value = demo.email;
              if (passRef.current) passRef.current.value = demo.password;
            }}
          >
            Rellenar automáticamente
          </button>
        </div>
      )}
      {estado.error && <Alert tono="peligro">{estado.error}</Alert>}
      <form action={accion} className="space-y-4">
        <Field id="email" label="Correo electrónico">
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={estado.email}
          />
        </Field>
        <Field id="password" label="Contraseña">
          <Input
            ref={passRef}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" tamano="lg" className="w-full" disabled={pendiente}>
          {pendiente ? (
            <>
              <Spinner /> Entrando…
            </>
          ) : (
            "Entrar al panel"
          )}
        </Button>
      </form>
    </div>
  );
}
