-- Admin chose the smart meter's figure for a day that had been typed in by hand: usage = this day's total - the day before's.
create or replace function public.use_tuya_meter_usage(p_room_id uuid, p_usage_date date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_end numeric;
  v_previous numeric;
  v_kwh numeric;
begin
  select end_total_kwh into v_end from meter_daily_usage where room_id = p_room_id and usage_date = p_usage_date;
  select end_total_kwh into v_previous from meter_daily_usage where room_id = p_room_id and usage_date = p_usage_date - 1;

  if v_end is null or v_previous is null then
    raise exception 'Meter totals missing for this day';
  end if;
  if v_end < v_previous then
    raise exception 'Meter total went down';
  end if;

  v_kwh := v_end - v_previous;
  update meter_daily_usage
  set kwh = v_kwh, source = 'tuya', note = null, updated_at = now()
  where room_id = p_room_id and usage_date = p_usage_date;

  return jsonb_build_object('ok', true, 'kwh', v_kwh);
end;
$$;

revoke execute on function public.use_tuya_meter_usage(uuid, date) from public, anon, authenticated;
grant execute on function public.use_tuya_meter_usage(uuid, date) to service_role;
