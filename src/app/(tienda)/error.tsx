"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { IconAlert } from "@/components/ui/icons";

export default function ErrorTienda({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icono={<IconAlert />}
      titulo="Algo no salió bien"
      accion={
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Intentar de nuevo</Button>
          <ButtonLink href="/" variante="secundario">
            Ir al inicio
          </ButtonLink>
        </div>
      }
    >
      No pudimos cargar esta página. Puede deberse a la conexión; espere unos segundos e inténtelo
      otra vez.
    </EmptyState>
  );
}
