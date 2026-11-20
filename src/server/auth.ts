import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";

/**
 * Exige un administrador (usuario autenticado registrado en public.admins).
 * Se memoriza por petición con React cache().
 */
export const requireAdmin = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("nombre")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) redirect("/admin/login?error=no-admin");

  return { supabase, user, nombre: (admin as { nombre: string }).nombre };
});

/** Para Server Actions: devuelve null en lugar de redirigir. */
export async function adminOpcional() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data ? { supabase, user } : null;
}
