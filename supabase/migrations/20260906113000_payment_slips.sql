alter table public.bills
  add column if not exists slip_path text,
  add column if not exists slip_original_name text,
  add column if not exists slip_content_type text,
  add column if not exists slip_size_bytes bigint,
  add column if not exists slip_submitted_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-slips',
  'payment-slips',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can view payment slips" on storage.objects;
create policy "Authenticated users can view payment slips"
on storage.objects for select
to authenticated
using (bucket_id = 'payment-slips');

create index if not exists bills_public_token_idx on public.bills (public_token);
