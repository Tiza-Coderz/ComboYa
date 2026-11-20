"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Spinner } from "@/components/ui/feedback";
import { IconImage, IconX } from "@/components/ui/icons";
import { subirImagen } from "@/server/actions/admin-catalogo";

const LADO_MAX = 1000;

/**
 * Reduce la imagen a 1000 px y la convierte a WebP en el navegador antes de
 * subirla: una foto de móvil de 4 MB queda en ~60 KB. Importa con conexiones lentas.
 */
async function comprimirAWebp(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, mal) =>
    canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo convertir"))), "image/webp", 0.8),
  );
}

export function SubirImagen({
  nombre,
  inicial,
  vistaPrevia,
}: {
  nombre: string;
  inicial: string | null;
  vistaPrevia: string | null;
}) {
  const [valor, setValor] = useState(inicial ?? "");
  const [preview, setPreview] = useState(vistaPrevia);
  const [estado, setEstado] = useState<"listo" | "subiendo" | "error">("listo");
  const [detalle, setDetalle] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      setEstado("error");
      setDetalle("Elija un archivo de imagen.");
      return;
    }
    setEstado("subiendo");
    setDetalle(null);
    try {
      const webp = await comprimirAWebp(archivo);
      const datos = new FormData();
      datos.append("archivo", webp, "imagen.webp");
      const r = await subirImagen(datos);
      if ("error" in r) throw new Error(r.error);
      const url = r.url;
      setValor(url);
      setPreview(url);
      setEstado("listo");
      setDetalle(`Imagen optimizada: ${Math.round(webp.size / 1024)} KB`);
    } catch {
      setEstado("error");
      setDetalle("No se pudo subir la imagen. Revise la conexión e intente de nuevo.");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={nombre} value={valor} />
      <div className="flex items-center gap-4">
        <div className="relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
          {preview ? (
            <Image src={preview} alt="Vista previa" fill sizes="112px" className="object-cover" />
          ) : (
            <IconImage size={32} />
          )}
          {estado === "subiendo" && (
            <div className="absolute inset-0 grid place-items-center bg-white/70">
              <Spinner className="text-brand-700" />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="bg-brand-50 text-brand-800 hover:bg-brand-100 inline-flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-semibold">
            {preview ? "Cambiar imagen" : "Subir imagen"}
            <input
              ref={input}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={alElegir}
              disabled={estado === "subiendo"}
            />
          </label>
          {preview && (
            <button
              type="button"
              onClick={() => {
                setValor("");
                setPreview(null);
              }}
              className="hover:text-danger-600 flex items-center gap-1 text-xs text-slate-500"
            >
              <IconX size={14} /> Quitar imagen
            </button>
          )}
        </div>
      </div>
      {detalle && (
        <p className={estado === "error" ? "text-danger-600 text-sm" : "text-xs text-slate-500"}>
          {detalle}
        </p>
      )}
    </div>
  );
}
