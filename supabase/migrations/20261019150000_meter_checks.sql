-- Temporary cross-check: the reading noted from the old rotating-disc meter, to compare with the Tuya smart meter
-- while both are in use. Nothing else reads this table; when the disc meters are retired, drop it.

create table if not exists public.meter_checks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  check_date date not null,
  disc_reading numeric(12,2) not null check (disc_reading >= 0),
  note text,
  created_at timestamptz not null default now(),
  unique (room_id, check_date)
);

alter table public.meter_checks enable row level security;

revoke all on table public.meter_checks from anon;
grant select, insert, update, delete on table public.meter_checks to authenticated;

drop policy if exists "Authenticated users manage meter checks" on public.meter_checks;
create policy "Authenticated users manage meter checks"
on public.meter_checks for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);
