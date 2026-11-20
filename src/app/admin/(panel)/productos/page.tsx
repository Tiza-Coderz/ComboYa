import type { Metadata } from "next";
import { ListaCatalogo } from "@/components/admin/lista-catalogo";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductosAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ListaCatalogo tipo="producto" searchParams={await searchParams} />;
}
