"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getServerEnv, publicEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "../supabase/admin";
import { TAG_CATALOGO } from "../supabase/public";

export interface EstadoReset {
  ok: boolean;
  mensaje: string | null;
}

/**
 * «Restablecer demo»: vuelve a sembrar catálogo, zonas, tasas y 30 pedidos,
 * restaura la contraseña del admin demo y borra las imágenes subidas.
 * Solo existe en modo demo; la BD limita a una ejecución por minuto.
 */
export async function restablecerDemo(): Promise<EstadoReset> {
  if (!publicEnv.NEXT_PUBLIC_DEMO_MODE) {
    return { ok: false, mensaje: "Esta acción solo está disponible en modo demo." };
  }
  const { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } = getServerEnv();
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.rpc("reset_demo");
  if (error) {
    return {
      ok: false,
      mensaje: error.message.startsWith("DEMASIADOS_RESETS")
        ? "La demo se restableció hace menos de un minuto. Espere un momento."
        : "No se pudo restablecer la demo. Intente de nuevo.",
    };
  }

  // Admin demo: si alguien cambió la contraseña, se restaura.
  const { data: usuarios } = await supabase.auth.admin.listUsers({ perPage: 200 });
  let usuario = usuarios?.users.find((u) => u.email === DEMO_ADMIN_EMAIL);
  if (usuario) {
    await supabase.auth.admin.updateUserById(usuario.id, { password: DEMO_ADMIN_PASSWORD });
  } else {
    const { data } = await supabase.auth.admin.createUser({
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
      email_confirm: true,
    });
    usuario = data.user ?? undefined;
  }
  if (usuario) {
    await supabase
      .from("admins")
      .upsert({ user_id: usuario.id, nombre: "Administrador demo" }, { onConflict: "user_id" });
  }

  // Imágenes subidas por visitantes de la demo.
  const { data: archivos } = await supabase.storage
    .from("catalogo")
    .list("subidas", { limit: 1000 });
  if (archivos && archivos.length > 0) {
    await supabase.storage.from("catalogo").remove(archivos.map((a) => `subidas/${a.name}`));
  }

  revalidateTag(TAG_CATALOGO);
  revalidatePath("/", "layout");
  return {
    ok: true,
    mensaje: `Demo restablecida: catálogo y 30 pedidos de ejemplo. Entre con ${DEMO_ADMIN_EMAIL}.`,
  };
}
