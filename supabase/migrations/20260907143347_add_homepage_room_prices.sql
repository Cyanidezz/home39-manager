alter table public.homepage_rooms
  add column monthly_price numeric(12, 2) not null default 0;

update public.homepage_rooms as homepage_room
set monthly_price = room.monthly_rent
from public.rooms as room
where room.room_code = homepage_room.room_code
  and room.monthly_rent is not null;

alter table public.homepage_rooms
  add constraint homepage_rooms_monthly_price_nonnegative
  check (monthly_price >= 0);
