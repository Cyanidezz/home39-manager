create table public.homepage_settings (
  id text primary key default 'default',
  banner_badge text not null default 'ห้องพักในเมืองหาดใหญ่',
  banner_title text not null default 'อยู่สบาย เดินทางสะดวก',
  banner_highlight text not null default 'ที่ Home 39',
  banner_description text not null default 'ตรวจสอบสถานะห้องพัก ดูรายละเอียด และติดต่อสอบถามห้องว่างได้ในหน้าเดียว',
  banner_image_url text,
  location_title text not null default 'เดินทางสะดวกในหาดใหญ่',
  location_description text not null default 'เปิดแผนที่เพื่อดูเส้นทางมายัง Home 39 และตรวจสอบระยะทางจากตำแหน่งของคุณ',
  map_url text not null default 'https://share.google/9SpwEy5eYMnBt4cnd',
  nearby_place text not null default 'โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.)',
  nearby_description text not null default 'สถานศึกษาสำคัญในพื้นที่หาดใหญ่',
  contact_title text not null default 'สนใจจองห้องพัก?',
  contact_description text not null default 'ติดต่อสอบถามสถานะห้อง ราคา และรายละเอียดเพิ่มเติมได้ทุกช่องทาง',
  facebook_url text not null default 'https://www.facebook.com/home39hdy',
  line_id text not null default '@069jzotj',
  line_url text not null default 'https://line.me/R/ti/p/%40069jzotj',
  phone_primary text not null default '087-0954441',
  phone_secondary text not null default '089-4644898',
  updated_at timestamptz not null default now(),
  constraint homepage_settings_singleton check (id = 'default')
);

insert into public.homepage_settings (id) values ('default');

create table public.homepage_rooms (
  room_code text primary key,
  title text not null,
  description text not null,
  cover_image_url text,
  image_urls text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint homepage_rooms_known_room check (room_code in ('A', 'B', 'C'))
);

insert into public.homepage_rooms (room_code, title, description)
values
  ('A', 'ห้อง A', 'ห้องพักส่วนตัว บรรยากาศสงบ เหมาะสำหรับพักอาศัยระยะยาว'),
  ('B', 'ห้อง B', 'ห้องพักสะดวกสบาย ในทำเลเดินทางง่ายใจกลางหาดใหญ่'),
  ('C', 'ห้อง C', 'พื้นที่พักอาศัยเป็นสัดส่วน พร้อมติดต่อสอบถามรายละเอียดเพิ่มเติม')
on conflict (room_code) do nothing;

alter table public.homepage_settings enable row level security;
alter table public.homepage_rooms enable row level security;

revoke all on table public.homepage_settings from anon;
revoke all on table public.homepage_rooms from anon;
grant select, insert, update on table public.homepage_settings to authenticated;
grant select, insert, update on table public.homepage_rooms to authenticated;

create policy "Authenticated users manage homepage settings"
on public.homepage_settings for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null and id = 'default');

create policy "Authenticated users manage homepage rooms"
on public.homepage_rooms for all to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homepage',
  'homepage',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users upload homepage images"
on storage.objects for insert to authenticated
with check (bucket_id = 'homepage' and (select auth.uid()) is not null);

create policy "Authenticated users view homepage image records"
on storage.objects for select to authenticated
using (bucket_id = 'homepage' and (select auth.uid()) is not null);

create policy "Authenticated users update homepage images"
on storage.objects for update to authenticated
using (bucket_id = 'homepage' and (select auth.uid()) is not null)
with check (bucket_id = 'homepage' and (select auth.uid()) is not null);

create policy "Authenticated users delete homepage images"
on storage.objects for delete to authenticated
using (bucket_id = 'homepage' and (select auth.uid()) is not null);
