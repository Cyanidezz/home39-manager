alter table public.tenants
  add column if not exists line_user_id text,
  add column if not exists line_linked_at timestamptz;

create unique index if not exists tenants_line_user_id_unique
  on public.tenants (line_user_id)
  where line_user_id is not null;

create table if not exists public.line_link_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.line_link_codes enable row level security;

drop policy if exists "Authenticated users can manage LINE link codes" on public.line_link_codes;
create policy "Authenticated users can manage LINE link codes"
on public.line_link_codes
for all
to authenticated
using (true)
with check (true);

revoke all on table public.line_link_codes from anon;
grant select, insert, update, delete on table public.line_link_codes to authenticated;

create or replace function public.claim_line_link_code(
  p_code_hash text,
  p_line_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code public.line_link_codes;
  v_tenant public.tenants;
begin
  select * into v_code
  from public.line_link_codes
  where code_hash = p_code_hash
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    return null;
  end if;

  update public.tenants
  set line_user_id = null,
      line_linked_at = null,
      updated_at = now()
  where line_user_id = p_line_user_id
    and id <> v_code.tenant_id;

  update public.tenants
  set line_user_id = p_line_user_id,
      line_linked_at = now(),
      updated_at = now()
  where id = v_code.tenant_id
  returning * into v_tenant;

  update public.line_link_codes
  set used_at = now()
  where id = v_code.id;

  return jsonb_build_object(
    'tenant_id', v_tenant.id,
    'tenant_name', v_tenant.full_name
  );
end;
$$;

revoke execute on function public.claim_line_link_code(text, text) from public, anon, authenticated;
grant execute on function public.claim_line_link_code(text, text) to service_role;

create index if not exists line_link_codes_tenant_id_idx
  on public.line_link_codes (tenant_id);
