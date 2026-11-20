import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getServerEnv, publicEnv } from "@/lib/env";

/**
 * Cliente con service role: SALTA RLS. Úselo solo en casos de uso de servidor
 * muy acotados (reset de la demo, subida de imágenes del seed).
 */
export function createSupabaseAdminClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    getServerEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
