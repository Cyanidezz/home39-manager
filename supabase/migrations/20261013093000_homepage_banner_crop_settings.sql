alter table public.homepage_settings
  add column if not exists banner_image_position_x integer not null default 50,
  add column if not exists banner_image_position_y integer not null default 50,
  add column if not exists banner_image_zoom integer not null default 100;