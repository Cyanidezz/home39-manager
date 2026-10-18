-- Optional proof (receipt/slip photo) for an expense. Private bucket: viewed through short-lived signed links.
-- expenses.receipt_path (already there) holds the object path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-receipts', 'expense-receipts', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Authenticated users upload expense receipts" on storage.objects;
create policy "Authenticated users upload expense receipts"
on storage.objects for insert to authenticated
with check (bucket_id = 'expense-receipts' and (select auth.uid()) is not null);

drop policy if exists "Authenticated users view expense receipts" on storage.objects;
create policy "Authenticated users view expense receipts"
on storage.objects for select to authenticated
using (bucket_id = 'expense-receipts' and (select auth.uid()) is not null);

drop policy if exists "Authenticated users delete expense receipts" on storage.objects;
create policy "Authenticated users delete expense receipts"
on storage.objects for delete to authenticated
using (bucket_id = 'expense-receipts' and (select auth.uid()) is not null);
