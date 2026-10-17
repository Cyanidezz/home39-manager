-- Clear the test data of one room (tenants, contracts, bills, payments/slips, LINE codes and logs) and keep the room itself,
-- reset to vacant. Run it by hand in the Supabase SQL editor; it is not a migration.
--
--   1. Change ROOM_CODE below (the one place, in both parts) and run PART 1 on its own. It lists what will be deleted and
--      the files in Storage that the database rows point at (the buckets keep them: delete those in Storage afterwards).
--   2. If the list is what you expect, run PART 2. It checks that exactly one room matches, deletes in one transaction
--      and prints what was removed. Any error rolls everything back.
--
-- Nothing outside this room is touched: other rooms, expenses, settings and the homepage content stay as they are.

-- ========================= PART 1: PREVIEW (read only) =========================
with target as (select id, room_code from public.rooms where room_code = 'ROOM_CODE'),
     t as (select id from public.tenants where room_id in (select id from target)),
     b as (select id from public.bills where room_id in (select id from target) or tenant_id in (select id from t))
select
  (select count(*) from target)                                                       as rooms_found,
  (select count(*) from t)                                                            as tenants,
  (select count(*) from public.contracts where tenant_id in (select id from t))       as contracts,
  (select count(*) from b)                                                            as bills,
  (select count(*) from public.bill_items where bill_id in (select id from b))        as bill_items,
  (select count(*) from public.payments where bill_id in (select id from b))          as payments_with_slips,
  (select count(*) from public.line_link_codes where tenant_id in (select id from t)) as line_link_codes;

-- Files in Storage that these rows point at (delete them in Storage > the bucket after PART 2):
with target as (select id from public.rooms where room_code = 'ROOM_CODE'),
     t as (select id from public.tenants where room_id in (select id from target)),
     b as (select id from public.bills where room_id in (select id from target) or tenant_id in (select id from t))
select 'contract' as kind, file_path as path from public.contracts where tenant_id in (select id from t) and file_path is not null
union all
select 'payment slip', slip_path from public.payments where bill_id in (select id from b) and slip_path is not null
order by 1, 2;

-- ========================= PART 2: DELETE (one transaction) =========================
begin;

create temp table target_room on commit drop as
  select id, room_code from public.rooms where room_code = 'ROOM_CODE';

do $$
begin
  if (select count(*) from target_room) <> 1 then
    raise exception 'Expected exactly one room with this code, found %', (select count(*) from target_room);
  end if;
end
$$;

create temp table target_tenants on commit drop as
  select id from public.tenants where room_id in (select id from target_room);

create temp table target_bills on commit drop as
  select id from public.bills
  where room_id in (select id from target_room) or tenant_id in (select id from target_tenants);

-- bill_items, payments, bill_status_logs, line_notification_logs and slip_upload_attempts go with their bill.
delete from public.bills where id in (select id from target_bills);
-- contracts and line_link_codes go with their tenant.
delete from public.tenants where id in (select id from target_tenants);

update public.rooms
set status = 'vacant', occupant_count = 0, updated_at = now()
where id in (select id from target_room);

select
  (select room_code from target_room)                                         as room,
  (select count(*) from target_bills)                                         as bills_deleted,
  (select count(*) from target_tenants)                                       as tenants_deleted,
  (select count(*) from public.bills where room_id in (select id from target_room)) as bills_left_in_room,
  (select status from public.rooms where id in (select id from target_room))  as room_status;

commit;
