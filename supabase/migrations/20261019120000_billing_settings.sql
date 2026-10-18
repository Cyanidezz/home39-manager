-- Dorm-wide water and electricity rates. One row; every room uses the same rates.
-- Each bill keeps the rates it was issued with (bills.water_rate_per_person / electricity_rate),
-- so changing a rate here only affects bills issued afterwards.

create table if not exists public.billing_settings (
  id text primary key default 'default',
  water_rate_per_person numeric(10,2) not null default 150 check (water_rate_per_person > 0 and water_rate_per_person <= 10000),
  electricity_rate numeric(10,2) not null default 7 check (electricity_rate > 0 and electricity_rate <= 1000),
  updated_at timestamptz not null default now(),
  constraint billing_settings_singleton check (id = 'default')
);

insert into public.billing_settings (id) values ('default') on conflict (id) do nothing;

alter table public.billing_settings enable row level security;

revoke all on table public.billing_settings from anon;
grant select, insert, update on table public.billing_settings to authenticated;

drop policy if exists "Authenticated users can view billing settings" on public.billing_settings;
create policy "Authenticated users can view billing settings"
on public.billing_settings for select to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Authenticated users can insert billing settings" on public.billing_settings;
create policy "Authenticated users can insert billing settings"
on public.billing_settings for insert to authenticated
with check ((select auth.uid()) is not null and id = 'default');

drop policy if exists "Authenticated users can update billing settings" on public.billing_settings;
create policy "Authenticated users can update billing settings"
on public.billing_settings for update to authenticated
using ((select auth.uid()) is not null and id = 'default')
with check ((select auth.uid()) is not null and id = 'default');
