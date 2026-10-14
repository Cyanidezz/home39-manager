-- Rate limiting for the public payment-slip upload endpoint.
--
-- Anyone holding a bill's public token can upload; this caps attempts per bill
-- and per client address so the storage bucket and HEIC conversion cannot be
-- hammered. Attempts are stored with a hashed address, never the raw IP.
create table if not exists public.slip_upload_attempts (
  id bigint generated always as identity primary key,
  bill_id uuid not null references public.bills(id) on delete cascade,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists slip_upload_attempts_bill_created_idx
  on public.slip_upload_attempts (bill_id, created_at desc);

create index if not exists slip_upload_attempts_ip_created_idx
  on public.slip_upload_attempts (ip_hash, created_at desc);

alter table public.slip_upload_attempts enable row level security;
-- No policies: only the service role (which bypasses RLS) may use this table.
revoke all on table public.slip_upload_attempts from anon, authenticated;

create or replace function public.check_slip_upload_rate(
  p_bill_id uuid,
  p_ip_hash text,
  p_window interval default interval '10 minutes',
  p_max_per_bill integer default 5,
  p_max_per_ip integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bill_count integer;
  v_ip_count integer;
begin
  -- Serialise concurrent attempts for the same bill so the count cannot be raced.
  perform pg_advisory_xact_lock(hashtextextended(p_bill_id::text, 0));

  delete from public.slip_upload_attempts
  where created_at < now() - interval '1 day';

  select count(*)::integer into v_bill_count
  from public.slip_upload_attempts
  where bill_id = p_bill_id
    and created_at > now() - p_window;

  select count(*)::integer into v_ip_count
  from public.slip_upload_attempts
  where ip_hash = p_ip_hash
    and created_at > now() - p_window;

  if v_bill_count >= p_max_per_bill or v_ip_count >= p_max_per_ip then
    return false;
  end if;

  insert into public.slip_upload_attempts (bill_id, ip_hash)
  values (p_bill_id, p_ip_hash);

  return true;
end;
$$;

revoke execute on function public.check_slip_upload_rate(uuid, text, interval, integer, integer)
from public, anon, authenticated;

grant execute on function public.check_slip_upload_rate(uuid, text, interval, integer, integer)
to service_role;

comment on function public.check_slip_upload_rate(uuid, text, interval, integer, integer) is
  'Returns true and records the attempt when the bill and client address are under the upload limit; false when rate limited.';
