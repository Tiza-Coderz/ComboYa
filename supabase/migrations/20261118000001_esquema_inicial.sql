-- ════════════════════════════════════════════════════════════════════════════
-- ComboYa · Esquema inicial
-- Catálogo (categorías, productos, combos), zonas de entrega, tasas de cambio,
-- banners, configuración y pedidos.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Tipos ──────────────────────────────────────────────────────────────────
create type public.tipo_producto as enum ('producto', 'combo');

create type public.estado_pedido as enum (
  'pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'
);

create type public.estado_pago as enum ('pendiente', 'pagado', 'reembolsado');

create type public.metodo_pago as enum ('enlace_pago', 'efectivo_entrega');

create type public.moneda as enum ('USD', 'EUR', 'CUP');

-- ─── Utilidad: updated_at automático ────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── Administradores ────────────────────────────────────────────────────────
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null,
  created_at timestamptz not null default now()
);

-- ─── Categorías ─────────────────────────────────────────────────────────────
create table public.categorias (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(nombre) between 2 and 60),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icono      text,
  orden      int  not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Productos y combos ─────────────────────────────────────────────────────
create table public.productos (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias (id) on delete restrict,
  tipo         public.tipo_producto not null default 'producto',
  nombre       text not null check (char_length(nombre) between 2 and 120),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  descripcion  text not null default '',
  precio_usd   numeric(10, 2) not null check (precio_usd >= 0),
  unidad       text,                                     -- "paquete 1 kg", "botella 1.5 L"
  imagen_url   text,
  stock        int check (stock is null or stock >= 0), -- null = sin control de stock
  activo       boolean not null default true,
  destacado    boolean not null default false,
  busqueda     tsvector generated always as (
                 to_tsvector('spanish'::regconfig,
                   nombre || ' ' || coalesce(unidad, '') || ' ' || descripcion)
               ) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index productos_categoria_idx on public.productos (categoria_id);
create index productos_activo_destacado_idx on public.productos (activo, destacado);
create index productos_busqueda_idx on public.productos using gin (busqueda);

create trigger productos_updated_at
  before update on public.productos
  for each row execute function public.set_updated_at();

-- Productos incluidos en un combo.
create table public.combo_items (
  combo_id    uuid not null references public.productos (id) on delete cascade,
  producto_id uuid not null references public.productos (id) on delete restrict,
  cantidad    int  not null check (cantidad between 1 and 99),
  primary key (combo_id, producto_id),
  check (combo_id <> producto_id)
);

create index combo_items_producto_idx on public.combo_items (producto_id);

-- Garantiza que combo_id apunte a un combo y producto_id a un producto simple.
create or replace function public.validar_combo_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select tipo from public.productos where id = new.combo_id) <> 'combo' then
    raise exception 'combo_id debe referenciar un producto de tipo combo';
  end if;
  if (select tipo from public.productos where id = new.producto_id) <> 'producto' then
    raise exception 'Un combo solo puede incluir productos simples';
  end if;
  return new;
end;
$$;

create trigger combo_items_validar
  before insert or update on public.combo_items
  for each row execute function public.validar_combo_item();

-- ─── Zonas de entrega ───────────────────────────────────────────────────────
create table public.zonas_entrega (
  id         uuid primary key default gen_random_uuid(),
  municipio  text not null unique,
  costo_usd  numeric(10, 2) not null check (costo_usd >= 0),
  dias_min   int not null check (dias_min >= 0),
  dias_max   int not null,
  activa     boolean not null default true,
  created_at timestamptz not null default now(),
  check (dias_max >= dias_min)
);

-- ─── Tasas de cambio (histórico) ────────────────────────────────────────────
-- 1 USD = `tasa` unidades de `moneda`. La vigente es la más reciente por moneda.
create table public.tasas_cambio (
  id            uuid primary key default gen_random_uuid(),
  moneda        public.moneda not null check (moneda <> 'USD'),
  tasa          numeric(12, 4) not null check (tasa > 0),
  vigente_desde timestamptz not null default now(),
  creado_por    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index tasas_cambio_moneda_fecha_idx on public.tasas_cambio (moneda, vigente_desde desc);

create view public.tasas_vigentes
with (security_invoker = true) as
select distinct on (moneda) moneda, tasa, vigente_desde
from public.tasas_cambio
where vigente_desde <= now()
order by moneda, vigente_desde desc;

-- ─── Banners del home ───────────────────────────────────────────────────────
create table public.banners (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  subtitulo  text,
  imagen_url text,
  enlace     text,
  orden      int not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Configuración del negocio (fila única) ─────────────────────────────────
create table public.configuracion (
  id               boolean primary key default true check (id),
  nombre_negocio   text not null default 'ComboYa',
  whatsapp_negocio text not null check (whatsapp_negocio ~ '^\d{8,15}$'),
  email_contacto   text,
  horario          text,
  updated_at       timestamptz not null default now()
);

create trigger configuracion_updated_at
  before update on public.configuracion
  for each row execute function public.set_updated_at();

-- ─── Pedidos ────────────────────────────────────────────────────────────────
create table public.pedidos (
  id                 uuid primary key default gen_random_uuid(),
  codigo             text not null unique check (codigo ~ '^CY-\d{4,6}$'),
  estado             public.estado_pedido not null default 'pendiente',
  estado_pago        public.estado_pago   not null default 'pendiente',
  metodo_pago        public.metodo_pago   not null,

  -- Comprador (en el exterior)
  comprador_nombre   text not null check (char_length(comprador_nombre) between 2 and 120),
  comprador_pais     text not null check (char_length(comprador_pais) between 2 and 60),
  comprador_telefono text not null check (comprador_telefono ~ '^\+?\d{7,15}$'),
  comprador_email    text not null check (comprador_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  -- Destinatario (en Cuba)
  dest_nombre        text not null check (char_length(dest_nombre) between 2 and 120),
  dest_carne         text check (dest_carne is null or dest_carne ~ '^\d{11}$'),
  dest_telefono      text not null check (dest_telefono ~ '^\+?\d{8,15}$'),
  zona_id            uuid references public.zonas_entrega (id) on delete set null,
  dest_municipio     text not null,                    -- snapshot
  dest_direccion     text not null check (char_length(dest_direccion) between 5 and 300),
  dest_referencia    text,
  mensaje_familia    text check (mensaje_familia is null or char_length(mensaje_familia) <= 500),

  -- Importes (snapshot al momento de la compra)
  subtotal_usd       numeric(10, 2) not null check (subtotal_usd >= 0),
  envio_usd          numeric(10, 2) not null check (envio_usd >= 0),
  total_usd          numeric(10, 2) not null check (total_usd >= 0),
  tasa_cup           numeric(12, 4),
  tasa_eur           numeric(12, 4),

  notas_internas     text,
  pagado_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (total_usd = subtotal_usd + envio_usd)
);

create index pedidos_created_at_idx on public.pedidos (created_at desc);
create index pedidos_estado_idx on public.pedidos (estado);
create index pedidos_municipio_idx on public.pedidos (dest_municipio);

create trigger pedidos_updated_at
  before update on public.pedidos
  for each row execute function public.set_updated_at();

create table public.pedido_items (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid not null references public.pedidos (id) on delete cascade,
  producto_id     uuid references public.productos (id) on delete set null,
  nombre          text not null,                        -- snapshot
  tipo            public.tipo_producto not null,        -- snapshot
  precio_unit_usd numeric(10, 2) not null check (precio_unit_usd >= 0),
  cantidad        int not null check (cantidad between 1 and 50)
);

create index pedido_items_pedido_idx on public.pedido_items (pedido_id);
create index pedido_items_producto_idx on public.pedido_items (producto_id);

-- Línea de tiempo del pedido (se muestra en /seguimiento).
create table public.pedido_eventos (
  id         uuid primary key default gen_random_uuid(),
  pedido_id  uuid not null references public.pedidos (id) on delete cascade,
  estado     public.estado_pedido,
  nota       text not null,
  created_at timestamptz not null default now()
);

create index pedido_eventos_pedido_idx on public.pedido_eventos (pedido_id, created_at);

-- Registra automáticamente la creación y cada cambio de estado o de pago.
create or replace function public.registrar_evento_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pedido_eventos (pedido_id, estado, nota, created_at)
    values (new.id, new.estado, 'Pedido recibido', new.created_at);
    return new;
  end if;

  if new.estado is distinct from old.estado then
    insert into public.pedido_eventos (pedido_id, estado, nota)
    values (new.id, new.estado, case new.estado
      when 'confirmado'     then 'Pedido confirmado'
      when 'en_preparacion' then 'Preparando su pedido'
      when 'en_camino'      then 'En camino al destinatario'
      when 'entregado'      then 'Entregado a la familia'
      when 'cancelado'      then 'Pedido cancelado'
      else 'Estado actualizado' end);
  end if;

  if new.estado_pago is distinct from old.estado_pago then
    if new.estado_pago = 'pagado' then
      new.pagado_at := coalesce(new.pagado_at, now());
      insert into public.pedido_eventos (pedido_id, estado, nota)
      values (new.id, null, 'Pago confirmado');
    elsif new.estado_pago = 'reembolsado' then
      insert into public.pedido_eventos (pedido_id, estado, nota)
      values (new.id, null, 'Pago reembolsado');
    end if;
  end if;

  return new;
end;
$$;

create trigger pedidos_evento_insert
  after insert on public.pedidos
  for each row execute function public.registrar_evento_pedido();

create trigger pedidos_evento_update
  before update on public.pedidos
  for each row execute function public.registrar_evento_pedido();
