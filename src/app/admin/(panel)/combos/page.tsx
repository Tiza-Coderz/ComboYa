import type { Metadata } from "next";
import { ListaCatalogo } from "@/components/admin/lista-catalogo";

export const metadata: Metadata = { title: "Combos" };

export default async function CombosAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ListaCatalogo tipo="combo" searchParams={await searchParams} />;
}
