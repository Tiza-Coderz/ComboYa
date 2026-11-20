-- ════════════════════════════════════════════════════════════════════════════
-- ComboYa · Funciones de pedidos
--
-- crear_pedido(jsonb)          → la tienda crea pedidos sin acceso directo a la tabla.
--                                Los precios y el envío se toman SIEMPRE de la BD.
-- obtener_seguimiento(text)    → datos mínimos para /seguimiento/[codigo].
--
-- Errores de negocio: se lanzan con SQLSTATE 'P0001' y un mensaje con prefijo
-- (ej. 'SIN_STOCK: Arroz') que la capa de servidor traduce a mensajes amigables.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Código corto CY-1234 ───────────────────────────────────────────────────
create or replace function public.generar_codigo_pedido()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_codigo text;
  v_digitos int := 4;
begin
  for intento in 1..30 loop
    -- Tras 15 colisiones pasamos a 5 dígitos (más de ~9 000 pedidos).
    if intento > 15 then v_digitos := 5; end if;
    v_codigo := 'CY-' || lpad(
      floor(random() * (10 ^ v_digitos - 10 ^ (v_digitos - 1)) + 10 ^ (v_digitos - 1))::int::text,
      v_digitos, '0');
    if not exists (select 1 from public.pedidos where codigo = v_codigo) then
      return v_codigo;
    end if;
  end loop;
  raise exception 'CODIGO_NO_DISPONIBLE: no se pudo generar un código único';
end;
$$;

-- ─── Crear pedido ───────────────────────────────────────────────────────────
create or replace function public.crear_pedido(p_pedido jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_comprador    jsonb := p_pedido -> 'comprador';
  v_dest         jsonb := p_pedido -> 'destinatario';
  v_zona         public.zonas_entrega%rowtype;
  v_items_count  int;
  v_faltante     text;
  v_sin_stock    text;
  v_subtotal     numeric(10, 2);
  v_pedido_id    uuid;
  v_codigo       text;
  v_recientes    int;
  v_items        jsonb;
begin
  -- 1. Items: agrupar duplicados y validar cantidades.
  select coalesce(jsonb_agg(jsonb_build_object('producto_id', producto_id, 'cantidad', cantidad)), '[]'::jsonb)
  into v_items
  from (
    select (i ->> 'producto_id')::uuid as producto_id, sum((i ->> 'cantidad')::int)::int as cantidad
    from jsonb_array_elements(coalesce(p_pedido -> 'items', '[]'::jsonb)) as i
    group by 1
  ) agrupados;

  v_items_count := jsonb_array_length(v_items);
  if v_items_count = 0 then
    raise exception 'CARRITO_VACIO: el pedido no tiene productos';
  end if;
  if v_items_count > 30 then
    raise exception 'DEMASIADOS_PRODUCTOS: máximo 30 productos distintos';
  end if;
  if exists (select 1 from jsonb_to_recordset(v_items) as i(producto_id uuid, cantidad int) where cantidad is null or cantidad < 1 or cantidad > 50) then
    raise exception 'CANTIDAD_INVALIDA: la cantidad debe estar entre 1 y 50';
  end if;

  -- 2. Productos activos (bloqueando filas para controlar stock).
  perform 1 from public.productos p join jsonb_to_recordset(v_items) as i(producto_id uuid, cantidad int) on i.producto_id = p.id for update of p;

  select coalesce(i.producto_id::text, '?') into v_faltante
  from jsonb_to_recordset(v_items) as i(producto_id uuid, cantidad int)
  left join public.productos p on p.id = i.producto_id and p.activo
  where p.id is null
  limit 1;
  if found then
    raise exception 'PRODUCTO_NO_DISPONIBLE: %', v_faltante;
  end if;

  select p.nombre into v_sin_stock
  from jsonb_to_recordset(v_items) as i(producto_id uuid, cantidad int) join public.productos p on p.id = i.producto_id
  where p.stock is not null and p.stock < i.cantidad
  limit 1;
  if found then
    raise exception 'SIN_STOCK: %', v_sin_stock;
  end if;

  -- 3. Zona de entrega.
  select * into v_zona
  from public.zonas_entrega
  where id = (v_dest ->> 'zona_id')::uuid and activa;
  if not found then
    raise exception 'ZONA_NO_DISPONIBLE: no entregamos en ese municipio por ahora';
  end if;

  -- 4. Antiabuso básico: máx. 5 pedidos por teléfono del comprador en 10 min.
  select count(*) into v_recientes
  from public.pedidos
  where comprador_telefono = v_comprador ->> 'telefono'
    and created_at > now() - interval '10 minutes';
  if v_recientes >= 5 then
    raise exception 'DEMASIADOS_PEDIDOS: espere unos minutos e intente de nuevo';
  end if;

  -- 5. Totales calculados en el servidor.
  select sum(p.precio_usd * i.cantidad) into v_subtotal
  from jsonb_to_recordset(v_items) as i(producto_id uuid, cantidad int) join public.productos p on p.id = i.producto_id;

  v_codigo := public.generar_codigo_pedido();

  insert into public.pedidos (
    codigo, metodo_pago,
    comprador_nombre, comprador_pais, comprador_telefono, comprador_email,
    dest_nombre, dest_carne, dest_telefono, zona_id, dest_municipio,
    dest_direccion, dest_referencia, mensaje_familia,
    subtotal_usd, envio_usd, total_usd, tasa_cup, tasa_eur
  ) values (
    v_codigo, (p_pedido ->> 'metodo_pago')::public.metodo_pago,
    trim(v_comprador ->> 'nombre'), trim(v_comprador ->> 'pais'),
    v_comprador ->> 'telefono', lower(trim(v_comprador ->> 'email')),
    trim(v_dest ->> 'nombre'), nullif(trim(v_dest ->> 'carne'), ''),
    v_dest ->> 'telefono', v_zona.id, v_zona.municipio,
    trim(v_dest ->> 'direccion'), nullif(trim(v_dest ->> 'referencia'), ''),
    nullif(trim(v_dest ->> 'mensaje'), ''),
    v_subtotal, v_zona.costo_usd, v_subtotal + v_zona.costo_usd,
    (select tasa from public.tasas_vigentes where moneda = 'CUP'),
    (select tasa from public.tasas_vigentes where moneda = 'EUR')
  )
  returning id into v_pedido_id;

  insert into public.pedido_items (pedido_id, producto_id, nombre, tipo, precio_unit_usd, cantidad)
  select v_pedido_id, p.id, p.nombre, p.tipo, p.precio_usd, i.cantidad
  from jsonb_to_recordset(v_items) as i(producto_id uuid, cantidad int) join public.productos p on p.id = i.producto_id;

  update public.productos p
  set stock = p.stock - i.cantidad
  from jsonb_to_recordset(v_items) as i(producto_id uuid, cantidad int)
  where p.id = i.producto_id and p.stock is not null;

  return jsonb_build_object(
    'id', v_pedido_id,
    'codigo', v_codigo,
    'subtotal_usd', v_subtotal,
    'envio_usd', v_zona.costo_usd,
    'total_usd', v_subtotal + v_zona.costo_usd,
    'municipio', v_zona.municipio,
    'dias_min', v_zona.dias_min,
    'dias_max', v_zona.dias_max
  );
end;
$$;

revoke all on function public.crear_pedido(jsonb) from public;
grant execute on function public.crear_pedido(jsonb) to anon, authenticated;

-- ─── Seguimiento público (datos mínimos, sin datos personales sensibles) ────
create or replace function public.obtener_seguimiento(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'codigo',       p.codigo,
    'estado',       p.estado,
    'estado_pago',  p.estado_pago,
    'metodo_pago',  p.metodo_pago,
    'created_at',   p.created_at,
    -- Solo el primer nombre del destinatario.
    'destinatario', split_part(p.dest_nombre, ' ', 1),
    'municipio',    p.dest_municipio,
    'dias_min',     z.dias_min,
    'dias_max',     z.dias_max,
    'subtotal_usd', p.subtotal_usd,
    'envio_usd',    p.envio_usd,
    'total_usd',    p.total_usd,
    'tasa_cup',     p.tasa_cup,
    'tasa_eur',     p.tasa_eur,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'nombre', it.nombre, 'tipo', it.tipo,
               'cantidad', it.cantidad, 'precio_unit_usd', it.precio_unit_usd)
             order by it.nombre)
      from public.pedido_items it where it.pedido_id = p.id), '[]'::jsonb),
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'estado', e.estado, 'nota', e.nota, 'created_at', e.created_at)
             order by e.created_at)
      from public.pedido_eventos e where e.pedido_id = p.id), '[]'::jsonb)
  )
  from public.pedidos p
  left join public.zonas_entrega z on z.id = p.zona_id
  where p.codigo = upper(trim(p_codigo));
$$;

revoke all on function public.obtener_seguimiento(text) from public;
grant execute on function public.obtener_seguimiento(text) to anon, authenticated;

-- ─── Devolver stock al cancelar ─────────────────────────────────────────────
create or replace function public.devolver_stock_al_cancelar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado = 'cancelado' and old.estado <> 'cancelado' then
    update public.productos p
    set stock = p.stock + it.cantidad
    from public.pedido_items it
    where it.pedido_id = new.id and it.producto_id = p.id and p.stock is not null;
  end if;
  return new;
end;
$$;

create trigger pedidos_devolver_stock
  after update of estado on public.pedidos
  for each row execute function public.devolver_stock_al_cancelar();

-- Las funciones internas no deben ser invocables vía la API.
revoke all on function public.generar_codigo_pedido() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.validar_combo_item() from public, anon, authenticated;
revoke all on function public.registrar_evento_pedido() from public, anon, authenticated;
revoke all on function public.devolver_stock_al_cancelar() from public, anon, authenticated;
