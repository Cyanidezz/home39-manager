alter table public.tenants
  add column if not exists termination_notice_date date,
  add column if not exists planned_move_out_date date,
  add column if not exists rent_waived_year integer,
  add column if not exists rent_waived_month integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tenants_move_out_dates_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_move_out_dates_check check (
        (termination_notice_date is null and planned_move_out_date is null)
        or (
          termination_notice_date is not null
          and planned_move_out_date is not null
          and planned_move_out_date >= (termination_notice_date + interval '1 month')::date
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'tenants_rent_waiver_check'
      and conrelid = 'public.tenants'::regclass
  ) then
    alter table public.tenants
      add constraint tenants_rent_waiver_check check (
        (rent_waived_year is null and rent_waived_month is null)
        or (
          rent_waived_year between 2000 and 2200
          and rent_waived_month between 1 and 12
        )
      );
  end if;
end
$$;

comment on column public.tenants.termination_notice_date is
  'Date the tenant notified the property manager that the rental contract will end.';
comment on column public.tenants.planned_move_out_date is
  'Tenant planned move-out date, at least one month after notice.';
comment on column public.tenants.rent_waived_year is
  'Billing year covered by the one-month advance rent.';
comment on column public.tenants.rent_waived_month is
  'Billing month covered by the one-month advance rent.';
