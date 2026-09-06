alter table public.tenants
  add column if not exists advance_rent_amount numeric,
  add column if not exists deposit_amount numeric,
  add column if not exists initial_electricity_meter numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenants_financial_amounts_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_financial_amounts_check check (
        (advance_rent_amount is null or advance_rent_amount >= 0)
        and (deposit_amount is null or deposit_amount >= 0)
        and (initial_electricity_meter is null or initial_electricity_meter >= 0)
      );
  end if;
end
$$;

create or replace function public.create_tenant_with_room(
  p_tenant_id uuid,
  p_room_id uuid,
  p_full_name text,
  p_phone text,
  p_move_in_date date,
  p_monthly_rent numeric,
  p_advance_rent_amount numeric,
  p_deposit_amount numeric,
  p_initial_electricity_meter numeric,
  p_occupant_count integer,
  p_note text,
  p_contract_file_path text,
  p_contract_original_name text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if trim(coalesce(p_full_name, '')) = '' then
    raise exception 'tenant name is required';
  end if;
  if p_move_in_date is null then
    raise exception 'move-in date is required';
  end if;
  if p_monthly_rent is null or p_monthly_rent <= 0 then
    raise exception 'monthly rent must be greater than zero';
  end if;
  if p_advance_rent_amount is null or p_advance_rent_amount < 0 then
    raise exception 'advance rent is required';
  end if;
  if p_deposit_amount is null or p_deposit_amount < 0 then
    raise exception 'deposit is required';
  end if;
  if p_initial_electricity_meter is not null and p_initial_electricity_meter < 0 then
    raise exception 'initial meter cannot be negative';
  end if;
  if p_occupant_count is null or p_occupant_count < 1 then
    raise exception 'occupant count must be at least one';
  end if;
  if exists (
    select 1 from public.tenants
    where room_id = p_room_id and is_active = true
  ) then
    raise exception 'room already has an active tenant';
  end if;

  insert into public.tenants (
    id, room_id, full_name, phone, move_in_date, is_active, note,
    advance_rent_amount, deposit_amount, initial_electricity_meter
  )
  values (
    p_tenant_id, p_room_id, trim(p_full_name), nullif(trim(coalesce(p_phone, '')), ''),
    p_move_in_date, true, nullif(trim(coalesce(p_note, '')), ''),
    p_advance_rent_amount, p_deposit_amount, p_initial_electricity_meter
  );

  update public.rooms
  set monthly_rent = p_monthly_rent,
      occupant_count = p_occupant_count,
      status = 'occupied',
      updated_at = now()
  where id = p_room_id;

  if not found then
    raise exception 'room not found';
  end if;

  if p_contract_file_path is not null and p_contract_original_name is not null then
    insert into public.contracts (
      tenant_id, room_id, contract_start, deposit_amount,
      file_path, original_file_name
    )
    values (
      p_tenant_id, p_room_id, p_move_in_date, p_deposit_amount,
      p_contract_file_path, p_contract_original_name
    );
  end if;

  return p_tenant_id;
end;
$$;

revoke all on function public.create_tenant_with_room(
  uuid, uuid, text, text, date, numeric, numeric, numeric, numeric,
  integer, text, text, text
) from public, anon;
grant execute on function public.create_tenant_with_room(
  uuid, uuid, text, text, date, numeric, numeric, numeric, numeric,
  integer, text, text, text
) to authenticated;

comment on column public.tenants.advance_rent_amount is
  'Advance rent paid at the beginning of this tenancy.';
comment on column public.tenants.deposit_amount is
  'Security deposit recorded for this tenancy.';
comment on column public.tenants.initial_electricity_meter is
  'Electricity meter reading at move-in, used as the first bill previous reading.';
