import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

export const TAG_CATALOGO = "catalogo";

/**
 * Cliente anónimo SIN cookies para leer el catálogo público. Al no depender de
 * la sesión, las páginas de la tienda pueden servirse estáticas (ISR) desde la
 * CDN, lo que importa mucho con conexiones lentas. Las respuestas se cachean
 * 60 s y el panel las invalida con revalidateTag(TAG_CATALOGO) al editar.
 */
export function createSupabasePublicClient() {
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, next: { revalidate: 60, tags: [TAG_CATALOGO] } }),
    },
  });
}

/** Cliente anónimo sin caché (RPC de pedidos y seguimiento, siempre frescos). */
export function createSupabaseAnonClient() {
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
