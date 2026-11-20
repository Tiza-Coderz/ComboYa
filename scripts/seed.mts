/**
 * Siembra la demo de ComboYa en el proyecto de Supabase configurado en .env.local:
 *   1. Crea (o repara) el usuario administrador demo y lo registra en public.admins.
 *   2. Ejecuta public.seed_demo(): catálogo, zonas, tasas, banners y 30 pedidos.
 *
 * Uso: pnpm seed   (requiere las migraciones aplicadas: pnpm db:push)
 *
 * Node 22 ejecuta TypeScript directamente (type stripping), sin dependencias extra.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.DEMO_ADMIN_EMAIL ?? "admin@demo.cu";
const password = process.env.DEMO_ADMIN_PASSWORD ?? "demo1234";

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function asegurarAdmin(): Promise<string> {
  const { data: lista, error: errLista } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (errLista) throw errLista;

  const existente = lista.users.find((u) => u.email === email);
  if (existente) {
    const { error } = await supabase.auth.admin.updateUserById(existente.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`✓ Usuario admin existente: ${email} (contraseña restablecida)`);
    return existente.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: "Administrador demo" },
  });
  if (error) throw error;
  console.log(`✓ Usuario admin creado: ${email}`);
  return data.user.id;
}

async function main() {
  const userId = await asegurarAdmin();

  const { error: errAdmin } = await supabase
    .from("admins")
    .upsert({ user_id: userId, nombre: "Administrador demo" }, { onConflict: "user_id" });
  if (errAdmin) throw errAdmin;
  console.log("✓ Registrado en public.admins");

  const { error: errSeed } = await supabase.rpc("seed_demo");
  if (errSeed) throw errSeed;

  const { count } = await supabase.from("pedidos").select("id", { count: "exact", head: true });
  console.log(`✓ Datos demo sembrados (${count ?? "?"} pedidos)`);
  console.log(`\nEntre en /admin/login con ${email} / ${password}`);
}

main().catch((e: unknown) => {
  console.error("✗ Error al sembrar:", e instanceof Error ? e.message : e);
  process.exit(1);
});
