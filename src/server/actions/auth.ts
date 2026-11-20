"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/domain/schemas";
import { createSupabaseServerClient } from "../supabase/server";

export interface EstadoLogin {
  error: string | null;
  email?: string;
}

export async function iniciarSesion(_prev: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const r = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  const email = String(form.get("email") ?? "");
  if (!r.success) return { error: "Escriba un correo y una contraseña válidos.", email };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(r.data);
  if (error || !data.user) {
    return { error: "Correo o contraseña incorrectos.", email };
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene acceso al panel.", email };
  }

  redirect("/admin");
}

export async function cerrarSesion() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
