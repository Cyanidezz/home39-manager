-- Framing (focal point + zoom) for each room's homepage cover photo,
-- same model as the banner: object-position x% y%, zoom around that point.
alter table public.homepage_rooms
  add column if not exists cover_image_position_x integer not null default 50,
  add column if not exists cover_image_position_y integer not null default 50,
  add column if not exists cover_image_zoom integer not null default 100;
