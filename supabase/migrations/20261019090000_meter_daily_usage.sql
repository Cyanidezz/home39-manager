-- Daily electricity usage per room, read from the Tuya smart meter (or typed in by hand for days the meter API can't give back).
--
-- Tuya only reports a running total (kWh), so at every Bangkok midnight the cron stores the total as it stood at the end of
-- the day, and a day's usage is that total minus the previous day's total. A day without a previous total has no usage.

create table if not exists public.meter_daily_usage (
  room_id uuid not null references public.rooms(id) on delete cascade,
  usage_date date not null,
  kwh numeric(12,3) check (kwh is null or kwh >= 0),
  -- Running meter total at the end of usage_date (Tuya rows only).
  end_total_kwh numeric(14,3) check (end_total_kwh is null or end_total_kwh >= 0),
  source text not null check (source in ('tuya', 'manual')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, usage_date)
);

alter table public.meter_daily_usage enable row level security;

drop policy if exists "Authenticated users can view meter usage" on public.meter_daily_usage;
create policy "Authenticated users can view meter usage"
on public.meter_daily_usage for select to authenticated
using ((select auth.uid()) is not null);

-- Cron: store the end-of-day total and work out the day's usage. Never touches a day that was entered by hand.
create or replace function public.record_meter_total(p_room_id uuid, p_usage_date date, p_total_kwh numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_previous numeric;
  v_kwh numeric;
  v_source text;
begin
  if p_total_kwh is null or p_total_kwh < 0 then
    raise exception 'Meter total must be zero or more';
  end if;

  select source into v_source from meter_daily_usage where room_id = p_room_id and usage_date = p_usage_date;
  if v_source = 'manual' then
    return jsonb_build_object('ok', true, 'skipped', 'manual');
  end if;

  select end_total_kwh into v_previous
  from meter_daily_usage where room_id = p_room_id and usage_date = p_usage_date - 1;

  -- A total below yesterday's means the meter was replaced or reset: no trustworthy usage for that day.
  if v_previous is not null and p_total_kwh >= v_previous then
    v_kwh := p_total_kwh - v_previous;
  end if;

  insert into meter_daily_usage (room_id, usage_date, kwh, end_total_kwh, source)
  values (p_room_id, p_usage_date, v_kwh, p_total_kwh, 'tuya')
  on conflict (room_id, usage_date) do update
    set kwh = excluded.kwh, end_total_kwh = excluded.end_total_kwh, source = 'tuya', updated_at = now();

  return jsonb_build_object('ok', true, 'kwh', v_kwh);
end;
$$;

-- Admin: type in (or correct) a day's usage by hand.
create or replace function public.save_manual_meter_usage(p_room_id uuid, p_usage_date date, p_kwh numeric, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_kwh is null or p_kwh < 0 then
    raise exception 'Usage must be zero or more';
  end if;
  if p_usage_date is null or p_usage_date > (now() at time zone 'Asia/Bangkok')::date then
    raise exception 'Usage date cannot be in the future';
  end if;
  if not exists (select 1 from rooms where id = p_room_id) then
    raise exception 'Room not found';
  end if;

  insert into meter_daily_usage (room_id, usage_date, kwh, end_total_kwh, source, note)
  values (p_room_id, p_usage_date, p_kwh, null, 'manual', nullif(btrim(p_note), ''))
  on conflict (room_id, usage_date) do update
    set kwh = excluded.kwh, end_total_kwh = null, source = 'manual', note = excluded.note, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

-- Admin: remove a day (a typo, or to let the meter fill it in again).
create or replace function public.delete_meter_usage(p_room_id uuid, p_usage_date date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from meter_daily_usage where room_id = p_room_id and usage_date = p_usage_date;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.record_meter_total(uuid, date, numeric) from public, anon, authenticated;
grant execute on function public.record_meter_total(uuid, date, numeric) to service_role;
revoke execute on function public.save_manual_meter_usage(uuid, date, numeric, text) from public, anon, authenticated;
grant execute on function public.save_manual_meter_usage(uuid, date, numeric, text) to service_role;
revoke execute on function public.delete_meter_usage(uuid, date) from public, anon, authenticated;
grant execute on function public.delete_meter_usage(uuid, date) to service_role;
