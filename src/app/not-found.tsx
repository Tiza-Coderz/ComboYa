import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { IconSearch } from "@/components/ui/icons";

export default function NoEncontrado() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icono={<IconSearch />}
        titulo="No encontramos esta página"
        accion={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/productos">Ver el catálogo</ButtonLink>
            <ButtonLink href="/" variante="secundario">
              Ir al inicio
            </ButtonLink>
          </div>
        }
      >
        Puede que el producto ya no esté disponible o que el enlace tenga un error.
      </EmptyState>
    </main>
  );
}
