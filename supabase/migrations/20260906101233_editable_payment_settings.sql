create table public.payment_settings (
  id text primary key default 'default',
  bank_name text not null,
  bank_code text,
  account_name text not null,
  account_number text not null,
  updated_at timestamptz not null default now(),
  constraint payment_settings_singleton check (id = 'default')
);

insert into public.payment_settings (
  id,
  bank_name,
  bank_code,
  account_name,
  account_number
) values (
  'default',
  'ธนาคารไทยพาณิชย์',
  'SCB',
  'นางสาวพิรญาณ์ จันทร์งาม',
  '206-269288-7'
);

alter table public.payment_settings enable row level security;

revoke all on table public.payment_settings from anon;
grant select, insert, update on table public.payment_settings to authenticated;

create policy "Authenticated users can view payment settings"
on public.payment_settings
for select
to authenticated
using ((select auth.uid()) is not null);

create policy "Authenticated users can insert payment settings"
on public.payment_settings
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and id = 'default'
);

create policy "Authenticated users can update payment settings"
on public.payment_settings
for update
to authenticated
using (
  (select auth.uid()) is not null
  and id = 'default'
)
with check (
  (select auth.uid()) is not null
  and id = 'default'
);

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
$$;

revoke execute on function public.get_public_bill(uuid) from public, authenticated;
grant execute on function public.get_public_bill(uuid) to anon;
