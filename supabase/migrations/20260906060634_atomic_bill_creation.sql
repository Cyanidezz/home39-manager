create or replace function public.create_bill_with_items(
  p_room_id uuid,
  p_tenant_id uuid,
  p_billing_year integer,
  p_billing_month integer,
  p_rent_amount numeric,
  p_occupant_count integer,
  p_water_rate_per_person numeric,
  p_water_amount numeric,
  p_previous_meter numeric,
  p_current_meter numeric,
  p_electricity_units numeric,
  p_electricity_rate numeric,
  p_electricity_amount numeric,
  p_other_amount numeric,
  p_total_amount numeric,
  p_due_date date,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_bill_id uuid;
  v_item jsonb;
  v_item_name text;
  v_item_amount numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_billing_month < 1 or p_billing_month > 12 then
    raise exception 'Invalid billing month';
  end if;

  if p_occupant_count < 0 then
    raise exception 'Occupant count cannot be negative';
  end if;

  if p_previous_meter is null or p_current_meter is null then
    raise exception 'Meter values are required';
  end if;

  if p_current_meter < p_previous_meter then
    raise exception 'Current meter cannot be less than previous meter';
  end if;

  if p_rent_amount < 0 or p_water_amount < 0 or p_electricity_amount < 0 or p_other_amount < 0 or p_total_amount < 0 then
    raise exception 'Amounts cannot be negative';
  end if;

  if not exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.room_id = p_room_id
      and t.is_active = true
  ) then
    raise exception 'Active tenant does not belong to this room';
  end if;

  insert into public.bills (
    room_id,
    tenant_id,
    billing_year,
    billing_month,
    rent_amount,
    occupant_count,
    water_rate_per_person,
    water_amount,
    previous_meter,
    current_meter,
    electricity_units,
    electricity_rate,
    electricity_amount,
    other_amount,
    other_note,
    total_amount,
    due_date,
    status,
    issued_at
  ) values (
    p_room_id,
    p_tenant_id,
    p_billing_year,
    p_billing_month,
    p_rent_amount,
    p_occupant_count,
    p_water_rate_per_person,
    p_water_amount,
    p_previous_meter,
    p_current_meter,
    p_electricity_units,
    p_electricity_rate,
    p_electricity_amount,
    p_other_amount,
    null,
    p_total_amount,
    p_due_date,
    'unpaid',
    now()
  )
  returning id into v_bill_id;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_item_name := btrim(coalesce(v_item ->> 'item_name', ''));
    v_item_amount := nullif(v_item ->> 'amount', '')::numeric;

    if v_item_name = '' or v_item_amount is null or v_item_amount <= 0 then
      raise exception 'Invalid bill item';
    end if;

    insert into public.bill_items (bill_id, item_name, amount)
    values (v_bill_id, v_item_name, v_item_amount);
  end loop;

  return v_bill_id;
exception
  when unique_violation then
    raise exception 'A bill for this room and billing period already exists';
end;
$$;

revoke execute on function public.create_bill_with_items(uuid, uuid, integer, integer, numeric, integer, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, date, jsonb) from public, anon;
grant execute on function public.create_bill_with_items(uuid, uuid, integer, integer, numeric, integer, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, date, jsonb) to authenticated;
