-- Billing integrity and bill-item order (found by the lifecycle tests).
--
-- 1. At most one active tenant per room, enforced by the table itself (previously only create_tenant_with_room checked).
-- 2. create_bill_with_items now validates what the browser sends: year range, period not before move-in,
--    previous meter continues from the last reading, and other_amount equals the sum of the items.
-- 3. bill_items gets an explicit `position` so items keep the order the owner typed (they were ordered by
--    created_at, identical within one transaction, so ties fell back to a random UUID).
-- Production was checked first: no room has two active tenants, so the unique index can be created.

create unique index if not exists tenants_one_active_per_room
  on public.tenants (room_id)
  where is_active and room_id is not null;

alter table public.bill_items
  add column if not exists position integer not null default 0;

update public.bill_items i
set position = r.rn - 1
from (
  select id, row_number() over (partition by bill_id order by created_at, id) as rn
  from public.bill_items
) r
where r.id = i.id;

CREATE OR REPLACE FUNCTION public.create_bill_with_items(p_room_id uuid, p_tenant_id uuid, p_billing_year integer, p_billing_month integer, p_rent_amount numeric, p_occupant_count integer, p_water_rate_per_person numeric, p_water_amount numeric, p_previous_meter numeric, p_current_meter numeric, p_electricity_units numeric, p_electricity_rate numeric, p_electricity_amount numeric, p_other_amount numeric, p_total_amount numeric, p_due_date date, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_bill_id uuid;
  v_item jsonb;
  v_item_name text;
  v_item_amount numeric;
  v_position integer := 0;
  v_items_total numeric := 0;
  v_move_in date;
  v_latest_year integer;
  v_latest_month integer;
  v_expected_meter numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_billing_year < 2000 or p_billing_year > 2200 then
    raise exception 'Invalid billing year';
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

  -- A bill cannot cover a month before the tenant moved in.
  select t.move_in_date into v_move_in from public.tenants t where t.id = p_tenant_id;
  if v_move_in is not null
     and make_date(p_billing_year, p_billing_month, 1) < date_trunc('month', v_move_in)::date then
    raise exception 'Billing period is before the tenant move-in date';
  end if;

  -- The previous meter must continue from the last reading, using the same rule as the bill form:
  -- the tenant's latest bill, else the reading recorded at move-in, else the room's last reading.
  -- Back-filling a period that is not newer than the tenant's latest bill is not checked.
  select b.billing_year, b.billing_month, b.current_meter
    into v_latest_year, v_latest_month, v_expected_meter
  from public.bills b
  where b.tenant_id = p_tenant_id and b.current_meter is not null
  order by b.billing_year desc, b.billing_month desc
  limit 1;

  if v_latest_year is null
     or (p_billing_year, p_billing_month) > (v_latest_year, v_latest_month) then
    if v_expected_meter is null then
      select t.initial_electricity_meter into v_expected_meter
      from public.tenants t where t.id = p_tenant_id;
    end if;
    if v_expected_meter is null then
      select b.current_meter into v_expected_meter
      from public.bills b
      where b.room_id = p_room_id and b.current_meter is not null
      order by b.billing_year desc, b.billing_month desc
      limit 1;
    end if;
    if v_expected_meter is not null and p_previous_meter <> v_expected_meter then
      raise exception 'Previous meter does not continue from the last reading (expected %)', v_expected_meter;
    end if;
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

    insert into public.bill_items (bill_id, item_name, amount, position)
    values (v_bill_id, v_item_name, v_item_amount, v_position);

    v_position := v_position + 1;
    v_items_total := v_items_total + v_item_amount;
  end loop;

  -- The client sends both the items and their total; they must agree (the bill is rolled back otherwise).
  if abs(v_items_total - p_other_amount) > 0.004 then
    raise exception 'Other amount does not match the sum of the bill items';
  end if;

  return v_bill_id;
exception
  when unique_violation then
    raise exception 'A bill for this room and billing period already exists';
end;
$function$;;

CREATE OR REPLACE FUNCTION public.get_public_bill(p_token uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'room_code', r.room_code,
    'tenant_name', t.full_name,
    'billing_year', b.billing_year,
    'billing_month', b.billing_month,
    'rent_amount', b.rent_amount,
    'occupant_count', b.occupant_count,
    'water_rate_per_person', b.water_rate_per_person,
    'water_amount', b.water_amount,
    'previous_meter', b.previous_meter,
    'current_meter', b.current_meter,
    'electricity_units', b.electricity_units,
    'electricity_rate', b.electricity_rate,
    'electricity_amount', b.electricity_amount,
    'other_amount', b.other_amount,
    'total_amount', b.total_amount,
    'due_date', b.due_date,
    'status', b.status,
    'issued_at', b.issued_at,
    'paid_at', b.paid_at,
    'bill_items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'item_name', bi.item_name,
            'amount', bi.amount
          ) order by bi.position, bi.created_at, bi.id
        )
        from public.bill_items bi
        where bi.bill_id = b.id
      ),
      '[]'::jsonb
    ),
    'payment_settings', (
      select jsonb_build_object(
        'bank_name', ps.bank_name,
        'bank_code', ps.bank_code,
        'account_name', ps.account_name,
        'account_number', ps.account_number
      )
      from public.payment_settings ps
      where ps.id = 'default'
      limit 1
    )
  )
  from public.bills b
  join public.rooms r on r.id = b.room_id
  left join public.tenants t on t.id = b.tenant_id
  where b.public_token = p_token
  limit 1;
$function$;;
