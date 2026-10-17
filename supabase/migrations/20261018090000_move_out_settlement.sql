-- Move-out settlement: after a tenant has moved out, the room is checked, the damage and the last water/electricity are
-- assessed, and what is owed is taken from the deposit; the rest is transferred back (with the transfer slip kept).
--
--   refund = deposit - (electricity + water + other deductions + unpaid bills)
--
-- A negative refund means the deposit did not cover everything and the tenant still owes the difference.
-- The advance rent is not part of this: it already paid the last month's rent (see set_tenant_move_out_notice).

create table if not exists public.move_out_settlements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  deposit_amount numeric(12,2) not null check (deposit_amount >= 0),
  final_electricity_meter numeric(12,2) check (final_electricity_meter is null or final_electricity_meter >= 0),
  electricity_amount numeric(12,2) not null default 0 check (electricity_amount >= 0),
  water_amount numeric(12,2) not null default 0 check (water_amount >= 0),
  -- Damage, cleaning, lost keys ...: [{"name": "...", "amount": 500}]
  items jsonb not null default '[]'::jsonb,
  items_amount numeric(12,2) not null default 0 check (items_amount >= 0),
  -- Issued bills of the tenant still unpaid when the settlement was last calculated.
  outstanding_bills_amount numeric(12,2) not null default 0 check (outstanding_bills_amount >= 0),
  total_deductions numeric(12,2) not null check (total_deductions >= 0),
  refund_amount numeric(12,2) not null,
  note text,
  status text not null default 'open' check (status in ('open', 'closed')),
  refunded_on date,
  refund_reference text,
  refund_slip_path text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint move_out_settlements_closed_check check (
    status = 'open' or closed_at is not null
  )
);

create index if not exists move_out_settlements_room_id_idx on public.move_out_settlements (room_id);

alter table public.move_out_settlements enable row level security;

drop policy if exists "Authenticated users can view move-out settlements" on public.move_out_settlements;
create policy "Authenticated users can view move-out settlements"
on public.move_out_settlements for select to authenticated
using ((select auth.uid()) is not null);

-- Writes go through the functions below (service role only).

-- The refund slip is a private file, like the contracts and payment slips.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'refund-slips', 'refund-slips', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "Authenticated users upload refund slips" on storage.objects;
create policy "Authenticated users upload refund slips"
on storage.objects for insert to authenticated
with check (bucket_id = 'refund-slips' and (select auth.uid()) is not null);

drop policy if exists "Authenticated users view refund slips" on storage.objects;
create policy "Authenticated users view refund slips"
on storage.objects for select to authenticated
using (bucket_id = 'refund-slips' and (select auth.uid()) is not null);

drop policy if exists "Authenticated users delete refund slips" on storage.objects;
create policy "Authenticated users delete refund slips"
on storage.objects for delete to authenticated
using (bucket_id = 'refund-slips' and (select auth.uid()) is not null);

-- Unpaid issued bills (not drafts, and not bills whose slip is waiting to be checked).
create or replace function public.tenant_outstanding_bills(p_tenant_id uuid)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(sum(total_amount), 0)::numeric(12,2)
  from public.bills
  where tenant_id = p_tenant_id and status in ('unpaid', 'overdue', 'rejected');
$$;

-- Saves (or recalculates) the settlement of a tenant who has already moved out.
create or replace function public.save_move_out_settlement(
  p_tenant_id uuid,
  p_final_electricity_meter numeric,
  p_electricity_amount numeric,
  p_water_amount numeric,
  p_items jsonb,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
  v_deposit numeric;
  v_move_out date;
  v_active boolean;
  v_status text;
  v_items_amount numeric := 0;
  v_item jsonb;
  v_outstanding numeric;
  v_total numeric;
  v_refund numeric;
begin
  select room_id, deposit_amount, move_out_date, is_active
  into v_room_id, v_deposit, v_move_out, v_active
  from public.tenants where id = p_tenant_id for update;

  if not found then raise exception 'Tenant not found'; end if;
  if v_active or v_move_out is null then raise exception 'Tenant has not moved out yet'; end if;
  if v_deposit is null then raise exception 'Tenant has no deposit recorded'; end if;

  select status into v_status from public.move_out_settlements where tenant_id = p_tenant_id;
  if v_status = 'closed' then raise exception 'Settlement is already closed'; end if;

  if p_final_electricity_meter is not null and p_final_electricity_meter < 0 then
    raise exception 'Final meter cannot be negative';
  end if;
  if coalesce(p_electricity_amount, 0) < 0 or coalesce(p_water_amount, 0) < 0 then
    raise exception 'Amounts cannot be negative';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Items must be a list';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or btrim(coalesce(v_item->>'name', '')) = ''
       or coalesce((v_item->>'amount')::numeric, 0) <= 0 then
      raise exception 'Each deduction needs a name and an amount above zero';
    end if;
    v_items_amount := v_items_amount + (v_item->>'amount')::numeric;
  end loop;

  v_outstanding := public.tenant_outstanding_bills(p_tenant_id);
  v_total := coalesce(p_electricity_amount, 0) + coalesce(p_water_amount, 0) + v_items_amount + v_outstanding;
  v_refund := v_deposit - v_total;

  insert into public.move_out_settlements (
    tenant_id, room_id, deposit_amount, final_electricity_meter, electricity_amount, water_amount,
    items, items_amount, outstanding_bills_amount, total_deductions, refund_amount, note
  )
  values (
    p_tenant_id, v_room_id, v_deposit, p_final_electricity_meter, coalesce(p_electricity_amount, 0),
    coalesce(p_water_amount, 0),
    (select coalesce(jsonb_agg(jsonb_build_object('name', btrim(e->>'name'), 'amount', (e->>'amount')::numeric)), '[]'::jsonb)
       from jsonb_array_elements(p_items) e),
    v_items_amount, v_outstanding, v_total, v_refund, nullif(btrim(coalesce(p_note, '')), '')
  )
  on conflict (tenant_id) do update
  set final_electricity_meter = excluded.final_electricity_meter,
      electricity_amount = excluded.electricity_amount,
      water_amount = excluded.water_amount,
      items = excluded.items,
      items_amount = excluded.items_amount,
      outstanding_bills_amount = excluded.outstanding_bills_amount,
      total_deductions = excluded.total_deductions,
      refund_amount = excluded.refund_amount,
      note = excluded.note,
      deposit_amount = excluded.deposit_amount,
      updated_at = now();

  return jsonb_build_object(
    'ok', true, 'deposit', v_deposit, 'outstandingBills', v_outstanding,
    'totalDeductions', v_total, 'refund', v_refund
  );
end;
$$;

-- Closes the settlement: records the refund transfer, and settles the unpaid bills out of the deposit.
-- p_expected_refund is the figure the admin saw; if the bills changed meanwhile the call fails instead of moving a different amount.
create or replace function public.close_move_out_settlement(
  p_tenant_id uuid,
  p_expected_refund numeric,
  p_refunded_on date,
  p_reference text,
  p_slip_path text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_settlement public.move_out_settlements;
  v_outstanding numeric;
  v_refund numeric;
  v_total numeric;
begin
  select * into v_settlement from public.move_out_settlements where tenant_id = p_tenant_id for update;
  if not found then raise exception 'Settlement not found'; end if;
  if v_settlement.status = 'closed' then raise exception 'Settlement is already closed'; end if;

  if exists (select 1 from public.bills where tenant_id = p_tenant_id and status in ('slip_submitted', 'verifying')) then
    raise exception 'A bill is waiting for its payment slip to be checked';
  end if;

  v_outstanding := public.tenant_outstanding_bills(p_tenant_id);
  v_total := v_settlement.electricity_amount + v_settlement.water_amount + v_settlement.items_amount + v_outstanding;
  v_refund := v_settlement.deposit_amount - v_total;

  if p_expected_refund is distinct from v_refund then
    raise exception 'The amounts changed since the settlement was saved; save it again first';
  end if;

  if v_refund > 0 then
    if p_refunded_on is null then raise exception 'Transfer date is required'; end if;
    if nullif(btrim(coalesce(p_reference, '')), '') is null and nullif(btrim(coalesce(p_slip_path, '')), '') is null then
      raise exception 'The transfer slip or a reference is required';
    end if;
  end if;

  -- The deposit pays these bills; they must not stay open in the monthly summary.
  insert into public.bill_status_logs (bill_id, old_status, new_status, reason)
  select id, status, 'paid', 'หักจากเงินมัดจำตอนสรุปย้ายออก'
  from public.bills where tenant_id = p_tenant_id and status in ('unpaid', 'overdue', 'rejected');

  update public.bills
  set status = 'paid', paid_at = coalesce(paid_at, now()), updated_at = now()
  where tenant_id = p_tenant_id and status in ('unpaid', 'overdue', 'rejected');

  update public.move_out_settlements
  set status = 'closed',
      outstanding_bills_amount = v_outstanding,
      total_deductions = v_total,
      refund_amount = v_refund,
      refunded_on = case when v_refund > 0 then p_refunded_on else null end,
      refund_reference = case when v_refund > 0 then nullif(btrim(coalesce(p_reference, '')), '') else null end,
      refund_slip_path = case when v_refund > 0 then nullif(btrim(coalesce(p_slip_path, '')), '') else null end,
      closed_at = now(),
      updated_at = now()
  where tenant_id = p_tenant_id;

  return jsonb_build_object('ok', true, 'refund', v_refund, 'owed', greatest(0, -v_refund));
end;
$$;

-- Reopens a closed settlement for a correction. Bills settled out of the deposit stay paid.
create or replace function public.reopen_move_out_settlement(p_tenant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.move_out_settlements
  set status = 'open', closed_at = null, refunded_on = null, refund_reference = null, refund_slip_path = null, updated_at = now()
  where tenant_id = p_tenant_id and status = 'closed';

  if not found then raise exception 'No closed settlement to reopen'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.tenant_outstanding_bills(uuid) from public, anon;
grant execute on function public.tenant_outstanding_bills(uuid) to authenticated, service_role;

revoke execute on function public.save_move_out_settlement(uuid, numeric, numeric, numeric, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_move_out_settlement(uuid, numeric, numeric, numeric, jsonb, text) to service_role;
revoke execute on function public.close_move_out_settlement(uuid, numeric, date, text, text) from public, anon, authenticated;
grant execute on function public.close_move_out_settlement(uuid, numeric, date, text, text) to service_role;
revoke execute on function public.reopen_move_out_settlement(uuid) from public, anon, authenticated;
grant execute on function public.reopen_move_out_settlement(uuid) to service_role;

comment on table public.move_out_settlements is
  'Deposit settlement after a tenant moves out: deductions, refund amount and the refund transfer record.';
