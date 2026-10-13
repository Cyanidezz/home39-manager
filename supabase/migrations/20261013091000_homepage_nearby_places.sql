alter table public.homepage_settings
  add column if not exists nearby_places text[] not null default '{}';

update public.homepage_settings
set nearby_places = case
  when nullif(btrim(nearby_place), '') is null then '{}'::text[]
  else array[btrim(nearby_place)]
end
where cardinality(nearby_places) = 0;