-- Fix: the nightly job re-reads the last 7 days, and for a day whose previous day had no stored total it overwrote a good
-- usage figure with NULL (typing the previous day by hand had also thrown away that day's meter total).
--
--  * record_meter_total never replaces a known usage figure with "unknown", and for a day entered by hand it still stores
--    the meter total (the usage typed in stays) so the next day can be worked out.
--  * save_manual_meter_usage keeps the meter total already stored for that day.

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
    update meter_daily_usage set end_total_kwh = p_total_kwh
    where room_id = p_room_id and usage_date = p_usage_date;
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
    set kwh = coalesce(excluded.kwh, meter_daily_usage.kwh),
        end_total_kwh = excluded.end_total_kwh,
        source = 'tuya',
        updated_at = now();

  select kwh into v_kwh from meter_daily_usage where room_id = p_room_id and usage_date = p_usage_date;
  return jsonb_build_object('ok', true, 'kwh', v_kwh);
end;
$$;

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
    set kwh = excluded.kwh, source = 'manual', note = excluded.note, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;
