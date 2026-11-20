-- ════════════════════════════════════════════════════════════════════════════
-- ComboYa · Integridad para el panel de administración
--
-- · validar_transicion_pedido(): la BD rechaza saltos de estado (p. ej.
--   pendiente → entregado) aunque alguien llame a la API directamente.
--   Refleja src/domain/order-status.ts.
-- · guardar_combo_items(): reemplaza los productos de un combo en una sola
--   transacción (security invoker: se aplican las políticas RLS del admin).
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.validar_transicion_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado and not (
       (old.estado = 'pendiente'      and new.estado in ('confirmado', 'cancelado'))
    or (old.estado = 'confirmado'     and new.estado in ('en_preparacion', 'cancelado'))
    or (old.estado = 'en_preparacion' and new.estado in ('en_camino', 'cancelado'))
    or (old.estado = 'en_camino'      and new.estado in ('entregado', 'cancelado'))
  ) then
    raise exception 'TRANSICION_INVALIDA: no se puede pasar de % a %', old.estado, new.estado;
  end if;

  if new.estado_pago is distinct from old.estado_pago and not (
       (old.estado_pago = 'pendiente' and new.estado_pago = 'pagado')
    or (old.estado_pago = 'pagado'    and new.estado_pago in ('pendiente', 'reembolsado'))
  ) then
    raise exception 'TRANSICION_INVALIDA: el pago no puede pasar de % a %', old.estado_pago, new.estado_pago;
  end if;

  if old.estado_pago = 'pagado' and new.estado_pago = 'pendiente' then
    new.pagado_at := null;
  end if;

  return new;
end;
$$;

-- Nombre con prefijo "a_" para que se ejecute antes que los demás BEFORE UPDATE
-- (Postgres los dispara en orden alfabético).
create trigger a_pedidos_validar_transicion
  before update of estado, estado_pago on public.pedidos
  for each row execute function public.validar_transicion_pedido();

revoke all on function public.validar_transicion_pedido() from public, anon, authenticated;

create or replace function public.guardar_combo_items(p_combo_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'NO_AUTORIZADO: solo administradores';
  end if;

  delete from public.combo_items where combo_id = p_combo_id;

  insert into public.combo_items (combo_id, producto_id, cantidad)
  select p_combo_id, (i ->> 'producto_id')::uuid, (i ->> 'cantidad')::int
  from jsonb_array_elements(p_items) as i;
end;
$$;

revoke all on function public.guardar_combo_items(uuid, jsonb) from public, anon;
grant execute on function public.guardar_combo_items(uuid, jsonb) to authenticated;
