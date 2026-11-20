-- ════════════════════════════════════════════════════════════════════════════
-- ComboYa · Seguridad: Row Level Security y Storage
--
-- Regla general:
--   · El público (anon) solo LEE el catálogo activo, zonas, banners, tasas y config.
--   · El público NUNCA lee ni escribe pedidos directamente: usa las RPC
--     crear_pedido() y obtener_seguimiento() (migración 3).
--   · Los administradores (tabla public.admins) pueden todo.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

revoke all on function public.es_admin() from public;
grant execute on function public.es_admin() to anon, authenticated;

-- ─── Activar RLS en todas las tablas ────────────────────────────────────────
alter table public.admins         enable row level security;
alter table public.categorias     enable row level security;
alter table public.productos      enable row level security;
alter table public.combo_items    enable row level security;
alter table public.zonas_entrega  enable row level security;
alter table public.tasas_cambio   enable row level security;
alter table public.banners        enable row level security;
alter table public.configuracion  enable row level security;
alter table public.pedidos        enable row level security;
alter table public.pedido_items   enable row level security;
alter table public.pedido_eventos enable row level security;

-- ─── Admins ─────────────────────────────────────────────────────────────────
create policy "admins: cada admin ve la lista"
  on public.admins for select to authenticated
  using ((select public.es_admin()));

-- ─── Catálogo: lectura pública, escritura admin ─────────────────────────────
create policy "categorias: lectura pública"
  on public.categorias for select to anon, authenticated
  using (true);
create policy "categorias: admin escribe"
  on public.categorias for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy "productos: lectura pública de activos"
  on public.productos for select to anon, authenticated
  using (activo or (select public.es_admin()));
create policy "productos: admin inserta"
  on public.productos for insert to authenticated
  with check ((select public.es_admin()));
create policy "productos: admin actualiza"
  on public.productos for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "productos: admin borra"
  on public.productos for delete to authenticated
  using ((select public.es_admin()));

create policy "combo_items: lectura pública"
  on public.combo_items for select to anon, authenticated
  using (true);
create policy "combo_items: admin escribe"
  on public.combo_items for all to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy "zonas: lectura pública de activas"
  on public.zonas_entrega for select to anon, authenticated
  using (activa or (select public.es_admin()));
create policy "zonas: admin inserta"
  on public.zonas_entrega for insert to authenticated
  with check ((select public.es_admin()));
create policy "zonas: admin actualiza"
  on public.zonas_entrega for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "zonas: admin borra"
  on public.zonas_entrega for delete to authenticated
  using ((select public.es_admin()));

create policy "tasas: lectura pública"
  on public.tasas_cambio for select to anon, authenticated
  using (true);
create policy "tasas: admin registra"
  on public.tasas_cambio for insert to authenticated
  with check ((select public.es_admin()));
-- El histórico de tasas no se edita ni se borra: se añade una nueva.

create policy "banners: lectura pública de activos"
  on public.banners for select to anon, authenticated
  using (activo or (select public.es_admin()));
create policy "banners: admin inserta"
  on public.banners for insert to authenticated
  with check ((select public.es_admin()));
create policy "banners: admin actualiza"
  on public.banners for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "banners: admin borra"
  on public.banners for delete to authenticated
  using ((select public.es_admin()));

create policy "configuracion: lectura pública"
  on public.configuracion for select to anon, authenticated
  using (true);
create policy "configuracion: admin actualiza"
  on public.configuracion for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- ─── Pedidos: solo admin ────────────────────────────────────────────────────
create policy "pedidos: admin lee"
  on public.pedidos for select to authenticated
  using ((select public.es_admin()));
create policy "pedidos: admin actualiza"
  on public.pedidos for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "pedidos: admin borra"
  on public.pedidos for delete to authenticated
  using ((select public.es_admin()));

create policy "pedido_items: admin lee"
  on public.pedido_items for select to authenticated
  using ((select public.es_admin()));

create policy "pedido_eventos: admin lee"
  on public.pedido_eventos for select to authenticated
  using ((select public.es_admin()));
create policy "pedido_eventos: admin añade notas"
  on public.pedido_eventos for insert to authenticated
  with check ((select public.es_admin()));

-- ─── Storage: bucket público de imágenes ────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "catalogo: admin sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'catalogo' and (select public.es_admin()));
create policy "catalogo: admin actualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'catalogo' and (select public.es_admin()));
create policy "catalogo: admin borra"
  on storage.objects for delete to authenticated
  using (bucket_id = 'catalogo' and (select public.es_admin()));
