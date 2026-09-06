create or replace function public.complete_tenant_move_out(
  p_tenant_id uuid,
  p_move_out_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
  v_room_code text;
  v_move_in_date date;
  v_notice_date date;
  v_contract_id uuid;
begin
  if p_move_out_date is null then
    raise exception 'Move-out date is required';
  end if;

  select room_id, move_in_date, termination_notice_date
  into v_room_id, v_move_in_date, v_notice_date
  from public.tenants
  where id = p_tenant_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Active tenant not found';
  end if;

  if v_move_in_date is not null and p_move_out_date < v_move_in_date then
    raise exception 'Move-out date cannot be before move-in date';
  end if;

  if v_notice_date is not null and p_move_out_date < v_notice_date then
    raise exception 'Move-out date cannot be before notice date';
  end if;

  select room_code
  into v_room_code
  from public.rooms
  where id = v_room_id
  for update;

  update public.tenants
  set is_active = false,
      move_out_date = p_move_out_date,
      updated_at = now()
  where id = p_tenant_id;

  update public.rooms
  set status = 'vacant',
      occupant_count = 0,
      updated_at = now()
  where id = v_room_id;

  select id
  into v_contract_id
  from public.contracts
  where tenant_id = p_tenant_id
  order by created_at desc
  limit 1;

  if v_contract_id is not null then
    update public.contracts
    set contract_end = p_move_out_date
    where id = v_contract_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'roomId', v_room_id,
    'roomCode', v_room_code,
    'moveOutDate', p_move_out_date
  );
end;
$$;

revoke execute on function public.complete_tenant_move_out(uuid, date)
from public, anon, authenticated;

grant execute on function public.complete_tenant_move_out(uuid, date)
to service_role;

comment on function public.complete_tenant_move_out(uuid, date) is
  'Atomically completes an active tenancy, records the actual move-out date, closes the latest contract, and marks the room vacant.';
