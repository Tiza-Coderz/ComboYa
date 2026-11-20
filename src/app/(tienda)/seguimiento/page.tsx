import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/feedback";
import { IconSearch, IconTruck } from "@/components/ui/icons";
import { normalizarCodigo } from "@/domain/order-code";

export const metadata: Metadata = {
  title: "Seguir mi pedido",
  description: "Consulte el estado de su pedido con el código CY-1234.",
};

type SearchParams = Promise<{ codigo?: string }>;

export default async function SeguimientoBuscarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { codigo } = await searchParams;
  let invalido = false;
  if (codigo !== undefined) {
    const normal = normalizarCodigo(codigo);
    if (normal) redirect(`/seguimiento/${normal}`);
    invalido = true;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6">
      <div className="space-y-2 text-center">
        <span className="bg-brand-50 text-brand-700 mx-auto grid size-14 place-items-center rounded-full">
          <IconTruck size={26} />
        </span>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Seguir mi pedido</h1>
        <p className="text-slate-600">
          Escriba el código que recibió al hacer el pedido (por ejemplo, <strong>CY-4821</strong>).
        </p>
      </div>
      {invalido && (
        <Alert tono="peligro">
          «{codigo}» no parece un código válido. Tiene la forma CY- seguida de 4 a 6 números.
        </Alert>
      )}
      <form
        action="/seguimiento"
        className="flex gap-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200"
      >
        <label htmlFor="codigo" className="sr-only">
          Código del pedido
        </label>
        <input
          id="codigo"
          name="codigo"
          required
          defaultValue={codigo}
          placeholder="CY-1234"
          autoCapitalize="characters"
          autoComplete="off"
          className="focus:ring-brand-500 h-12 flex-1 rounded-xl border-0 px-4 text-lg font-semibold tracking-wider uppercase ring-1 ring-slate-300 focus:ring-2 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-brand-700 hover:bg-brand-800 inline-flex h-12 items-center gap-2 rounded-xl px-5 font-semibold text-white"
        >
          <IconSearch size={18} /> Buscar
        </button>
      </form>
    </div>
  );
}
