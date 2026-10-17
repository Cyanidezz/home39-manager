-- Short MP4 clips for the room galleries live in their own bucket so the
-- image bucket keeps its 10 MB / image-only limits.
-- 50 MB is the largest per-file size Supabase's free plan allows.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homepage-videos',
  'homepage-videos',
  true,
  52428800,
  array['video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users upload homepage videos"
on storage.objects for insert to authenticated
with check (bucket_id = 'homepage-videos' and (select auth.uid()) is not null);

create policy "Authenticated users view homepage video records"
on storage.objects for select to authenticated
using (bucket_id = 'homepage-videos' and (select auth.uid()) is not null);

create policy "Authenticated users update homepage videos"
on storage.objects for update to authenticated
using (bucket_id = 'homepage-videos' and (select auth.uid()) is not null)
with check (bucket_id = 'homepage-videos' and (select auth.uid()) is not null);

create policy "Authenticated users delete homepage videos"
on storage.objects for delete to authenticated
using (bucket_id = 'homepage-videos' and (select auth.uid()) is not null);
