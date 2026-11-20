"use client";

import { useEffect, useState } from "react";
import { ButtonA } from "@/components/ui/button";
import { IconWhatsApp } from "@/components/ui/icons";

/**
 * Tras confirmar el pedido, el checkout guarda en sessionStorage el enlace de
 * WhatsApp con el resumen. Si el navegador bloqueó la ventana, aquí queda el botón.
 */
export function EnviarPorWhatsApp({ codigo, respaldo }: { codigo: string; respaldo: string }) {
  const [enlace, setEnlace] = useState(respaldo);
  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem(`comboya:wa:${codigo}`);
      if (guardado) setEnlace(guardado);
    } catch {
      /* sin almacenamiento */
    }
  }, [codigo]);

  return (
    <ButtonA href={enlace} variante="whatsapp" tamano="lg" className="w-full sm:w-auto">
      <IconWhatsApp /> Enviar el pedido por WhatsApp
    </ButtonA>
  );
}
