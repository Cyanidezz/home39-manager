create or replace function public.cancel_tenant_move_out(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
  v_rent_waived_year integer;
  v_rent_waived_month integer;
  v_monthly_rent numeric;
  v_adjusted_bills integer := 0;
begin
  select room_id, rent_waived_year, rent_waived_month
  into v_room_id, v_rent_waived_year, v_rent_waived_month
  from public.tenants
  where id = p_tenant_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Active tenant not found';
  end if;

  select monthly_rent
  into v_monthly_rent
  from public.rooms
  where id = v_room_id
  for update;

  if v_rent_waived_year is not null and v_rent_waived_month is not null then
    with restored_bills as (
      update public.bills
      set rent_amount = v_monthly_rent,
          total_amount = total_amount + v_monthly_rent,
          updated_at = now()
      where tenant_id = p_tenant_id
        and room_id = v_room_id
        and billing_year = v_rent_waived_year
        and billing_month = v_rent_waived_month
        and rent_amount = 0
      returning id
    ),
    cleared_notifications as (
      delete from public.line_notification_logs notification
      using restored_bills restored
      where notification.bill_id = restored.id
      returning notification.id
    )
    select count(*)::integer
    into v_adjusted_bills
    from restored_bills;
  end if;

  update public.tenants
  set termination_notice_date = null,
      planned_move_out_date = null,
      rent_waived_year = null,
      rent_waived_month = null,
      updated_at = now()
  where id = p_tenant_id;

  update public.rooms
  set status = 'occupied',
      updated_at = now()
  where id = v_room_id;

  return jsonb_build_object(
    'ok', true,
    'roomId', v_room_id,
    'adjustedBills', v_adjusted_bills
  );
end;
$$;

revoke execute on function public.cancel_tenant_move_out(uuid)
from public, anon, authenticated;

grant execute on function public.cancel_tenant_move_out(uuid)
to service_role;

comment on function public.cancel_tenant_move_out(uuid) is
  'Atomically cancels an active tenant move-out notice, restores any waived rent bill, and marks the room occupied.';
