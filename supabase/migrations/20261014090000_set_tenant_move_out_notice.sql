-- Atomically records a tenant move-out notice.
--
-- Replaces the multi-step logic in PATCH /api/tenants/[tenantId]/move-out
-- (tenant update, then bill-by-bill rent waiver) so a failure part-way can no
-- longer leave the tenant saved but bills unadjusted.
--
-- Behaviour:
--   * Changing the notice to a different month first restores the rent that was
--     waived on the previous notice month's unpaid bills.
--   * The rent of the new notice month's unpaid bills is waived (rent_amount = 0).
--   * Paid bills are never modified; they are only counted so the UI can say so.
--   * Re-submitting the same notice month is idempotent.
create or replace function public.set_tenant_move_out_notice(
  p_tenant_id uuid,
  p_notice_date date,
  p_move_out_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
  v_prev_year integer;
  v_prev_month integer;
  v_monthly_rent numeric;
  v_year integer;
  v_month integer;
  v_restored integer := 0;
  v_adjusted integer := 0;
  v_skipped_paid integer := 0;
begin
  if p_notice_date is null or p_move_out_date is null then
    raise exception 'Notice date and move-out date are required';
  end if;

  if p_move_out_date < (p_notice_date + interval '1 month')::date then
    raise exception 'Move-out date must be at least one month after the notice date';
  end if;

  select room_id, rent_waived_year, rent_waived_month
  into v_room_id, v_prev_year, v_prev_month
  from public.tenants
  where id = p_tenant_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Active tenant not found';
  end if;

  if v_room_id is null then
    raise exception 'Tenant is not assigned to a room';
  end if;

  select monthly_rent
  into v_monthly_rent
  from public.rooms
  where id = v_room_id
  for update;

  v_year := extract(year from p_notice_date)::integer;
  v_month := extract(month from p_notice_date)::integer;

  -- Notice moved to another month: give the earlier month its rent back.
  if v_prev_year is not null
     and v_prev_month is not null
     and (v_prev_year, v_prev_month) is distinct from (v_year, v_month) then
    with restored_bills as (
      update public.bills
      set rent_amount = v_monthly_rent,
          total_amount = total_amount + v_monthly_rent,
          updated_at = now()
      where tenant_id = p_tenant_id
        and room_id = v_room_id
        and billing_year = v_prev_year
        and billing_month = v_prev_month
        and rent_amount = 0
        and status <> 'paid'
      returning id
    ),
    cleared_notifications as (
      delete from public.line_notification_logs notification
      using restored_bills restored
      where notification.bill_id = restored.id
      returning notification.id
    )
    select count(*)::integer into v_restored from restored_bills;
  end if;

  update public.tenants
  set termination_notice_date = p_notice_date,
      planned_move_out_date = p_move_out_date,
      rent_waived_year = v_year,
      rent_waived_month = v_month,
      updated_at = now()
  where id = p_tenant_id;

  with waived_bills as (
    update public.bills
    set total_amount = greatest(0, total_amount - rent_amount),
        rent_amount = 0,
        updated_at = now()
    where tenant_id = p_tenant_id
      and room_id = v_room_id
      and billing_year = v_year
      and billing_month = v_month
      and rent_amount > 0
      and status <> 'paid'
    returning id
  ),
  cleared_notifications as (
    delete from public.line_notification_logs notification
    using waived_bills waived
    where notification.bill_id = waived.id
    returning notification.id
  )
  select count(*)::integer into v_adjusted from waived_bills;

  select count(*)::integer
  into v_skipped_paid
  from public.bills
  where tenant_id = p_tenant_id
    and room_id = v_room_id
    and billing_year = v_year
    and billing_month = v_month
    and status = 'paid';

  return jsonb_build_object(
    'ok', true,
    'rentWaivedYear', v_year,
    'rentWaivedMonth', v_month,
    'adjustedBills', v_adjusted,
    'restoredBills', v_restored,
    'skippedPaidBills', v_skipped_paid
  );
end;
$$;

revoke execute on function public.set_tenant_move_out_notice(uuid, date, date)
from public, anon, authenticated;

grant execute on function public.set_tenant_move_out_notice(uuid, date, date)
to service_role;

comment on function public.set_tenant_move_out_notice(uuid, date, date) is
  'Atomically saves a tenant move-out notice, restores rent waived for a previous notice month, and waives rent on unpaid bills of the new notice month. Paid bills are never changed.';
