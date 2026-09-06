alter table public.bills
  alter column status set default 'unpaid';

create or replace function public.get_public_bill(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
          ) order by bi.created_at, bi.id
        )
        from public.bill_items bi
        where bi.bill_id = b.id
      ),
      '[]'::jsonb
    )
  )
  from public.bills b
  join public.rooms r on r.id = b.room_id
  left join public.tenants t on t.id = b.tenant_id
  where b.public_token = p_token
  limit 1;
$$;

revoke execute on function public.get_public_bill(uuid) from public;
grant execute on function public.get_public_bill(uuid) to anon, authenticated;

create or replace function public.update_bill_status(
  p_bill_id uuid,
  p_new_status text,
  p_reason text
)
returns public.bills
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_bill public.bills;
  v_old_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_new_status not in (
    'draft', 'unpaid', 'slip_submitted', 'verifying',
    'paid', 'overdue', 'rejected'
  ) then
    raise exception 'Invalid bill status: %', p_new_status;
  end if;

  if nullif(btrim(p_reason), '') is null then
    raise exception 'Reason is required';
  end if;

  select b.status into v_old_status
  from public.bills b
  where b.id = p_bill_id
  for update;

  if not found then
    raise exception 'Bill not found';
  end if;

  if v_old_status = p_new_status then
    raise exception 'New status must differ from current status';
  end if;

  update public.bills b
  set status = p_new_status,
      paid_at = case
        when p_new_status = 'paid' then coalesce(b.paid_at, now())
        when v_old_status = 'paid' and p_new_status <> 'paid' then null
        else b.paid_at
      end,
      updated_at = now()
  where b.id = p_bill_id
  returning b.* into v_bill;

  insert into public.bill_status_logs (
    bill_id, old_status, new_status, reason
  ) values (
    p_bill_id, v_old_status, p_new_status, btrim(p_reason)
  );

  return v_bill;
end;
$$;

revoke execute on function public.update_bill_status(uuid, text, text) from public, anon;
grant execute on function public.update_bill_status(uuid, text, text) to authenticated;
