-- Homepage "common areas / overview" section: heading copy and an ordered list
-- of photos and floor plans ([{url, caption, kind: 'photo' | 'plan'}]).
alter table public.homepage_settings
  add column if not exists gallery_title text not null default 'ภาพรวมและส่วนกลาง',
  add column if not exists gallery_description text not null default 'ดูบรรยากาศโดยรวมของหอพัก พื้นที่ส่วนกลาง และแปลนห้องพัก',
  add column if not exists gallery_items jsonb not null default '[]'::jsonb;
