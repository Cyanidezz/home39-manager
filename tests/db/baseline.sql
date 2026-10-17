-- Schema-only snapshot of the production `public` schema (no data), generated from the live catalog
-- with read-only queries (tests/db/generate-baseline.mjs). Used by tests/db to run the SQL functions
-- against an in-memory Postgres (PGlite). Regenerate when migrations change the schema.

create table public."bill_items" (
  "id" uuid default gen_random_uuid() not null,
  "bill_id" uuid not null,
  "item_name" text not null,
  "amount" numeric default 0 not null,
  "created_at" timestamptz default now() not null
);

create table public."bill_status_logs" (
  "id" uuid default gen_random_uuid() not null,
  "bill_id" uuid not null,
  "old_status" text,
  "new_status" text not null,
  "reason" text not null,
  "changed_at" timestamptz default now() not null
);

create table public."bills" (
  "id" uuid default gen_random_uuid() not null,
  "room_id" uuid not null,
  "billing_year" integer not null,
  "billing_month" integer not null,
  "rent_amount" numeric(12,2) default 0 not null,
  "occupant_count" integer default 1 not null,
  "water_rate_per_person" numeric(12,2) default 150 not null,
  "water_amount" numeric(12,2) default 0 not null,
  "previous_meter" numeric(12,2),
  "current_meter" numeric(12,2),
  "electricity_units" numeric(12,2) default 0 not null,
  "electricity_rate" numeric(12,2) default 7 not null,
  "electricity_amount" numeric(12,2) default 0 not null,
  "other_amount" numeric(12,2) default 0 not null,
  "other_note" text,
  "total_amount" numeric(12,2) default 0 not null,
  "due_date" date,
  "status" text default 'unpaid'::text not null,
  "public_token" uuid default gen_random_uuid() not null,
  "issued_at" timestamptz,
  "paid_at" timestamptz,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  "tenant_id" uuid,
  "slip_path" text,
  "slip_original_name" text,
  "slip_content_type" text,
  "slip_size_bytes" bigint,
  "slip_submitted_at" timestamptz,
  "slip_preview_path" text
);

create table public."contracts" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid not null,
  "room_id" uuid,
  "contract_start" date,
  "contract_end" date,
  "deposit_amount" numeric(12,2) default 0,
  "file_path" text,
  "original_file_name" text,
  "note" text,
  "created_at" timestamptz default now() not null
);

create table public."expenses" (
  "id" uuid default gen_random_uuid() not null,
  "expense_date" date default CURRENT_DATE not null,
  "category" text not null,
  "amount" numeric(12,2) not null,
  "billing_year" integer,
  "billing_month" integer,
  "note" text,
  "receipt_path" text,
  "created_at" timestamptz default now() not null
);

create table public."homepage_rooms" (
  "room_code" text not null,
  "title" text not null,
  "description" text not null,
  "cover_image_url" text,
  "image_urls" text[] default '{}'::text[] not null,
  "updated_at" timestamptz default now() not null,
  "monthly_price" numeric(12,2) default 0 not null,
  "cover_image_position_x" integer default 50 not null,
  "cover_image_position_y" integer default 50 not null,
  "cover_image_zoom" integer default 100 not null
);

create table public."homepage_settings" (
  "id" text default 'default'::text not null,
  "banner_badge" text default 'ห้องพักในเมืองหาดใหญ่'::text not null,
  "banner_title" text default 'อยู่สบาย เดินทางสะดวก'::text not null,
  "banner_highlight" text default 'ที่ Home 39'::text not null,
  "banner_description" text default 'ตรวจสอบสถานะห้องพัก ดูรายละเอียด และติดต่อสอบถามห้องว่างได้ในหน้าเดียว'::text not null,
  "banner_image_url" text,
  "location_title" text default 'เดินทางสะดวกในหาดใหญ่'::text not null,
  "location_description" text default 'เปิดแผนที่เพื่อดูเส้นทางมายัง Home 39 และตรวจสอบระยะทางจากตำแหน่งของคุณ'::text not null,
  "map_url" text default 'https://share.google/9SpwEy5eYMnBt4cnd'::text not null,
  "nearby_place" text default 'โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.)'::text not null,
  "nearby_description" text default 'สถานศึกษาสำคัญในพื้นที่หาดใหญ่'::text not null,
  "contact_title" text default 'สนใจจองห้องพัก?'::text not null,
  "contact_description" text default 'ติดต่อสอบถามสถานะห้อง ราคา และรายละเอียดเพิ่มเติมได้ทุกช่องทาง'::text not null,
  "facebook_url" text default 'https://www.facebook.com/home39hdy'::text not null,
  "line_id" text default '@069jzotj'::text not null,
  "line_url" text default 'https://line.me/R/ti/p/%40069jzotj'::text not null,
  "phone_primary" text default '087-0954441'::text not null,
  "phone_secondary" text default '089-4644898'::text not null,
  "updated_at" timestamptz default now() not null,
  "nearby_places" text[] default '{}'::text[] not null,
  "banner_image_position_x" integer default 50 not null,
  "banner_image_position_y" integer default 50 not null,
  "banner_image_zoom" integer default 100 not null,
  "gallery_title" text default 'ภาพรวมและส่วนกลาง'::text not null,
  "gallery_description" text default 'ดูบรรยากาศโดยรวมของหอพัก พื้นที่ส่วนกลาง และแปลนห้องพัก'::text not null,
  "gallery_items" jsonb default '[]'::jsonb not null
);

create table public."line_link_codes" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid not null,
  "code_hash" text not null,
  "expires_at" timestamptz not null,
  "used_at" timestamptz,
  "created_at" timestamptz default now() not null
);

create table public."line_notification_logs" (
  "id" uuid default gen_random_uuid() not null,
  "bill_id" uuid not null,
  "notification_type" text not null,
  "sent_at" timestamptz default now() not null
);

create table public."payment_settings" (
  "id" text default 'default'::text not null,
  "bank_name" text not null,
  "bank_code" text,
  "account_name" text not null,
  "account_number" text not null,
  "updated_at" timestamptz default now() not null
);

create table public."payments" (
  "id" uuid default gen_random_uuid() not null,
  "bill_id" uuid not null,
  "amount" numeric(12,2),
  "slip_path" text,
  "original_file_name" text,
  "transfer_date" date,
  "transfer_time" time,
  "verification_status" text default 'pending'::text not null,
  "transaction_ref" text,
  "sender_name" text,
  "sender_bank" text,
  "receiver_name" text,
  "receiver_bank" text,
  "receiver_account" text,
  "amount_match" boolean,
  "receiver_match" boolean,
  "duplicate_check" boolean,
  "verification_provider" text,
  "verification_response" jsonb,
  "verified_at" timestamptz,
  "rejected_reason" text,
  "created_at" timestamptz default now() not null
);

create table public."rooms" (
  "id" uuid default gen_random_uuid() not null,
  "room_code" text not null,
  "monthly_rent" numeric(12,2) default 5000 not null,
  "occupant_count" integer default 1 not null,
  "status" text default 'occupied'::text not null,
  "note" text,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null
);

create table public."settings" (
  "key" text not null,
  "value" text not null,
  "description" text,
  "updated_at" timestamptz default now() not null
);

create table public."slip_upload_attempts" (
  "id" bigint generated always as identity not null,
  "bill_id" uuid not null,
  "ip_hash" text not null,
  "created_at" timestamptz default now() not null
);

create table public."tenants" (
  "id" uuid default gen_random_uuid() not null,
  "room_id" uuid,
  "full_name" text not null,
  "phone" text,
  "line_user_id" text,
  "email" text,
  "move_in_date" date,
  "move_out_date" date,
  "is_active" boolean default true not null,
  "note" text,
  "created_at" timestamptz default now() not null,
  "updated_at" timestamptz default now() not null,
  "line_linked_at" timestamptz,
  "termination_notice_date" date,
  "planned_move_out_date" date,
  "rent_waived_year" integer,
  "rent_waived_month" integer,
  "advance_rent_amount" numeric,
  "deposit_amount" numeric,
  "initial_electricity_meter" numeric
);

alter table public."bill_items" add constraint "bill_items_pkey" PRIMARY KEY (id);
alter table public."bill_status_logs" add constraint "bill_status_logs_pkey" PRIMARY KEY (id);
alter table public."bills" add constraint "bills_pkey" PRIMARY KEY (id);
alter table public."contracts" add constraint "contracts_pkey" PRIMARY KEY (id);
alter table public."expenses" add constraint "expenses_pkey" PRIMARY KEY (id);
alter table public."homepage_rooms" add constraint "homepage_rooms_pkey" PRIMARY KEY (room_code);
alter table public."homepage_settings" add constraint "homepage_settings_pkey" PRIMARY KEY (id);
alter table public."line_link_codes" add constraint "line_link_codes_pkey" PRIMARY KEY (id);
alter table public."line_notification_logs" add constraint "line_notification_logs_pkey" PRIMARY KEY (id);
alter table public."payment_settings" add constraint "payment_settings_pkey" PRIMARY KEY (id);
alter table public."payments" add constraint "payments_pkey" PRIMARY KEY (id);
alter table public."rooms" add constraint "rooms_pkey" PRIMARY KEY (id);
alter table public."settings" add constraint "settings_pkey" PRIMARY KEY (key);
alter table public."slip_upload_attempts" add constraint "slip_upload_attempts_pkey" PRIMARY KEY (id);
alter table public."tenants" add constraint "tenants_pkey" PRIMARY KEY (id);
alter table public."bills" add constraint "bills_public_token_key" UNIQUE (public_token);
alter table public."bills" add constraint "bills_room_id_billing_year_billing_month_key" UNIQUE (room_id, billing_year, billing_month);
alter table public."line_link_codes" add constraint "line_link_codes_code_hash_key" UNIQUE (code_hash);
alter table public."line_notification_logs" add constraint "line_notification_logs_bill_id_notification_type_key" UNIQUE (bill_id, notification_type);
alter table public."rooms" add constraint "rooms_room_code_key" UNIQUE (room_code);
alter table public."bill_items" add constraint "bill_items_amount_check" CHECK ((amount >= (0)::numeric));
alter table public."bills" add constraint "bills_billing_month_check" CHECK (((billing_month >= 1) AND (billing_month <= 12)));
alter table public."bills" add constraint "bills_occupant_count_check" CHECK ((occupant_count >= 0));
alter table public."bills" add constraint "bills_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'unpaid'::text, 'slip_submitted'::text, 'verifying'::text, 'paid'::text, 'overdue'::text, 'rejected'::text])));
alter table public."expenses" add constraint "expenses_amount_check" CHECK ((amount >= (0)::numeric));
alter table public."expenses" add constraint "expenses_billing_month_check" CHECK (((billing_month >= 1) AND (billing_month <= 12)));
alter table public."expenses" add constraint "expenses_category_check" CHECK ((category = ANY (ARRAY['water'::text, 'electricity'::text, 'maintenance'::text, 'internet'::text, 'cleaning'::text, 'other'::text])));
alter table public."homepage_rooms" add constraint "homepage_rooms_known_room" CHECK ((room_code = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])));
alter table public."homepage_rooms" add constraint "homepage_rooms_monthly_price_nonnegative" CHECK ((monthly_price >= (0)::numeric));
alter table public."homepage_settings" add constraint "homepage_settings_singleton" CHECK ((id = 'default'::text));
alter table public."line_notification_logs" add constraint "line_notification_logs_notification_type_check" CHECK ((notification_type = ANY (ARRAY['due_3_days'::text, 'overdue'::text])));
alter table public."payment_settings" add constraint "payment_settings_singleton" CHECK ((id = 'default'::text));
alter table public."payments" add constraint "payments_verification_status_check" CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verifying'::text, 'verified'::text, 'failed'::text, 'manual_review'::text])));
alter table public."rooms" add constraint "rooms_occupant_count_check" CHECK ((occupant_count >= 0));
alter table public."rooms" add constraint "rooms_status_check" CHECK ((status = ANY (ARRAY['occupied'::text, 'vacant'::text, 'maintenance'::text])));
alter table public."tenants" add constraint "tenants_financial_amounts_check" CHECK ((((advance_rent_amount IS NULL) OR (advance_rent_amount >= (0)::numeric)) AND ((deposit_amount IS NULL) OR (deposit_amount >= (0)::numeric)) AND ((initial_electricity_meter IS NULL) OR (initial_electricity_meter >= (0)::numeric))));
alter table public."tenants" add constraint "tenants_move_out_dates_check" CHECK ((((termination_notice_date IS NULL) AND (planned_move_out_date IS NULL)) OR ((termination_notice_date IS NOT NULL) AND (planned_move_out_date IS NOT NULL) AND (planned_move_out_date >= ((termination_notice_date + '1 mon'::interval))::date))));
alter table public."tenants" add constraint "tenants_rent_waiver_check" CHECK ((((rent_waived_year IS NULL) AND (rent_waived_month IS NULL)) OR (((rent_waived_year >= 2000) AND (rent_waived_year <= 2200)) AND ((rent_waived_month >= 1) AND (rent_waived_month <= 12)))));
alter table public."bill_items" add constraint "bill_items_bill_id_fkey" FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;
alter table public."bill_status_logs" add constraint "bill_status_logs_bill_id_fkey" FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;
alter table public."bills" add constraint "bills_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;
alter table public."bills" add constraint "bills_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
alter table public."contracts" add constraint "contracts_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;
alter table public."contracts" add constraint "contracts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table public."line_link_codes" add constraint "line_link_codes_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table public."line_notification_logs" add constraint "line_notification_logs_bill_id_fkey" FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;
alter table public."payments" add constraint "payments_bill_id_fkey" FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;
alter table public."slip_upload_attempts" add constraint "slip_upload_attempts_bill_id_fkey" FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE;
alter table public."tenants" add constraint "tenants_room_id_fkey" FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL;

CREATE INDEX bill_items_bill_id_idx ON public.bill_items USING btree (bill_id);
CREATE INDEX bill_status_logs_bill_id_idx ON public.bill_status_logs USING btree (bill_id);
CREATE INDEX bills_public_token_idx ON public.bills USING btree (public_token);
CREATE INDEX bills_tenant_id_idx ON public.bills USING btree (tenant_id);
CREATE INDEX idx_bills_billing_period ON public.bills USING btree (billing_year, billing_month);
CREATE INDEX idx_bills_room_id ON public.bills USING btree (room_id);
CREATE INDEX idx_bills_status ON public.bills USING btree (status);
CREATE INDEX idx_contracts_room_id ON public.contracts USING btree (room_id);
CREATE INDEX idx_contracts_tenant_id ON public.contracts USING btree (tenant_id);
CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date);
CREATE INDEX line_link_codes_tenant_id_idx ON public.line_link_codes USING btree (tenant_id);
CREATE INDEX line_notification_logs_bill_id_idx ON public.line_notification_logs USING btree (bill_id);
CREATE INDEX idx_payments_bill_id ON public.payments USING btree (bill_id);
CREATE UNIQUE INDEX idx_payments_transaction_ref_unique ON public.payments USING btree (transaction_ref) WHERE (transaction_ref IS NOT NULL);
CREATE INDEX slip_upload_attempts_bill_created_idx ON public.slip_upload_attempts USING btree (bill_id, created_at DESC);
CREATE INDEX slip_upload_attempts_ip_created_idx ON public.slip_upload_attempts USING btree (ip_hash, created_at DESC);
CREATE INDEX idx_tenants_room_id ON public.tenants USING btree (room_id);
CREATE UNIQUE INDEX tenants_line_user_id_unique ON public.tenants USING btree (line_user_id) WHERE (line_user_id IS NOT NULL);

create view public."bill_summary" as  SELECT b.id,
    r.room_code,
    b.billing_year,
    b.billing_month,
    b.rent_amount,
    b.occupant_count,
    b.water_rate_per_person,
    b.water_amount,
    b.previous_meter,
    b.current_meter,
    b.electricity_units,
    b.electricity_rate,
    b.electricity_amount,
    b.other_amount,
    b.total_amount,
    b.due_date,
    b.status,
    b.public_token,
    b.paid_at,
    b.created_at
   FROM (bills b
     JOIN rooms r ON ((r.id = b.room_id)));

CREATE OR REPLACE FUNCTION public.calculate_bill()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin

    new.water_amount :=
        round(
            (coalesce(new.occupant_count, 0)
            * coalesce(new.water_rate_per_person, 0))::numeric,
            2
        );

    if new.previous_meter is not null
       and new.current_meter is not null then

        if new.current_meter < new.previous_meter then
            raise exception
                'Current meter cannot be less than previous meter';
        end if;

        new.electricity_units :=
            round(
                (new.current_meter - new.previous_meter)::numeric,
                2
            );

    else
        new.electricity_units := 0;
    end if;

    new.electricity_amount :=
        round(
            (
                coalesce(new.electricity_units, 0)
                * coalesce(new.electricity_rate, 0)
            )::numeric,
            2
        );

    new.total_amount :=
        round(
            (
                coalesce(new.rent_amount, 0)
                + coalesce(new.water_amount, 0)
                + coalesce(new.electricity_amount, 0)
                + coalesce(new.other_amount, 0)
            )::numeric,
            2
        );

    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_tenant_move_out(p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_room_id uuid;
  v_rent_waived_year integer;
  v_rent_waived_month integer;
  v_monthly_rent numeric;
  v_adjusted_bills integer := 0;
  v_skipped_paid integer := 0;
begin
  select room_id, rent_waived_year, rent_waived_month
  into v_room_id, v_rent_waived_year, v_rent_waived_month
  from public.tenants
  where id = p_tenant_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Active tenant not found';
  end if;

  select monthly_rent
  into v_monthly_rent
  from public.rooms
  where id = v_room_id
  for update;

  if v_rent_waived_year is not null and v_rent_waived_month is not null then
    with restored_bills as (
      update public.bills
      set rent_amount = v_monthly_rent,
          total_amount = total_amount + v_monthly_rent,
          updated_at = now()
      where tenant_id = p_tenant_id
        and room_id = v_room_id
        and billing_year = v_rent_waived_year
        and billing_month = v_rent_waived_month
        and rent_amount = 0
        and status <> 'paid'
      returning id
    ),
    cleared_notifications as (
      delete from public.line_notification_logs notification
      using restored_bills restored
      where notification.bill_id = restored.id
      returning notification.id
    )
    select count(*)::integer
    into v_adjusted_bills
    from restored_bills;

    select count(*)::integer
    into v_skipped_paid
    from public.bills
    where tenant_id = p_tenant_id
      and room_id = v_room_id
      and billing_year = v_rent_waived_year
      and billing_month = v_rent_waived_month
      and rent_amount = 0
      and status = 'paid';
  end if;

  update public.tenants
  set termination_notice_date = null,
      planned_move_out_date = null,
      rent_waived_year = null,
      rent_waived_month = null,
      updated_at = now()
  where id = p_tenant_id;

  update public.rooms
  set status = 'occupied',
      updated_at = now()
  where id = v_room_id;

  return jsonb_build_object(
    'ok', true,
    'roomId', v_room_id,
    'adjustedBills', v_adjusted_bills,
    'skippedPaidBills', v_skipped_paid
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.check_slip_upload_rate(p_bill_id uuid, p_ip_hash text, p_window interval DEFAULT '00:10:00'::interval, p_max_per_bill integer DEFAULT 5, p_max_per_ip integer DEFAULT 20)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_bill_count integer;
  v_ip_count integer;
begin
  -- Serialise concurrent attempts for the same bill so the count cannot be raced.
  perform pg_advisory_xact_lock(hashtextextended(p_bill_id::text, 0));

  delete from public.slip_upload_attempts
  where created_at < now() - interval '1 day';

  select count(*)::integer into v_bill_count
  from public.slip_upload_attempts
  where bill_id = p_bill_id
    and created_at > now() - p_window;

  select count(*)::integer into v_ip_count
  from public.slip_upload_attempts
  where ip_hash = p_ip_hash
    and created_at > now() - p_window;

  if v_bill_count >= p_max_per_bill or v_ip_count >= p_max_per_ip then
    return false;
  end if;

  insert into public.slip_upload_attempts (bill_id, ip_hash)
  values (p_bill_id, p_ip_hash);

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_line_link_code(p_code_hash text, p_line_user_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code public.line_link_codes;
  v_tenant public.tenants;
begin
  select * into v_code
  from public.line_link_codes
  where code_hash = p_code_hash
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    return null;
  end if;

  update public.tenants
  set line_user_id = null,
      line_linked_at = null,
      updated_at = now()
  where line_user_id = p_line_user_id
    and id <> v_code.tenant_id;

  update public.tenants
  set line_user_id = p_line_user_id,
      line_linked_at = now(),
      updated_at = now()
  where id = v_code.tenant_id
  returning * into v_tenant;

  update public.line_link_codes
  set used_at = now()
  where id = v_code.id;

  return jsonb_build_object(
    'tenant_id', v_tenant.id,
    'tenant_name', v_tenant.full_name
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_tenant_move_out(p_tenant_id uuid, p_move_out_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_room_id uuid;
  v_room_code text;
  v_move_in_date date;
  v_notice_date date;
  v_contract_id uuid;
begin
  if p_move_out_date is null then
    raise exception 'Move-out date is required';
  end if;

  select room_id, move_in_date, termination_notice_date
  into v_room_id, v_move_in_date, v_notice_date
  from public.tenants
  where id = p_tenant_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Active tenant not found';
  end if;

  if v_move_in_date is not null and p_move_out_date < v_move_in_date then
    raise exception 'Move-out date cannot be before move-in date';
  end if;

  if v_notice_date is not null and p_move_out_date < v_notice_date then
    raise exception 'Move-out date cannot be before notice date';
  end if;

  select room_code
  into v_room_code
  from public.rooms
  where id = v_room_id
  for update;

  update public.tenants
  set is_active = false,
      move_out_date = p_move_out_date,
      updated_at = now()
  where id = p_tenant_id;

  update public.rooms
  set status = 'vacant',
      occupant_count = 0,
      updated_at = now()
  where id = v_room_id;

  select id
  into v_contract_id
  from public.contracts
  where tenant_id = p_tenant_id
  order by created_at desc
  limit 1;

  if v_contract_id is not null then
    update public.contracts
    set contract_end = p_move_out_date
    where id = v_contract_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'roomId', v_room_id,
    'roomCode', v_room_code,
    'moveOutDate', p_move_out_date
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_bill_with_items(p_room_id uuid, p_tenant_id uuid, p_billing_year integer, p_billing_month integer, p_rent_amount numeric, p_occupant_count integer, p_water_rate_per_person numeric, p_water_amount numeric, p_previous_meter numeric, p_current_meter numeric, p_electricity_units numeric, p_electricity_rate numeric, p_electricity_amount numeric, p_other_amount numeric, p_total_amount numeric, p_due_date date, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_bill_id uuid;
  v_item jsonb;
  v_item_name text;
  v_item_amount numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_billing_month < 1 or p_billing_month > 12 then
    raise exception 'Invalid billing month';
  end if;

  if p_occupant_count < 0 then
    raise exception 'Occupant count cannot be negative';
  end if;

  if p_previous_meter is null or p_current_meter is null then
    raise exception 'Meter values are required';
  end if;

  if p_current_meter < p_previous_meter then
    raise exception 'Current meter cannot be less than previous meter';
  end if;

  if p_rent_amount < 0 or p_water_amount < 0 or p_electricity_amount < 0 or p_other_amount < 0 or p_total_amount < 0 then
    raise exception 'Amounts cannot be negative';
  end if;

  if not exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
      and t.room_id = p_room_id
      and t.is_active = true
  ) then
    raise exception 'Active tenant does not belong to this room';
  end if;

  insert into public.bills (
    room_id,
    tenant_id,
    billing_year,
    billing_month,
    rent_amount,
    occupant_count,
    water_rate_per_person,
    water_amount,
    previous_meter,
    current_meter,
    electricity_units,
    electricity_rate,
    electricity_amount,
    other_amount,
    other_note,
    total_amount,
    due_date,
    status,
    issued_at
  ) values (
    p_room_id,
    p_tenant_id,
    p_billing_year,
    p_billing_month,
    p_rent_amount,
    p_occupant_count,
    p_water_rate_per_person,
    p_water_amount,
    p_previous_meter,
    p_current_meter,
    p_electricity_units,
    p_electricity_rate,
    p_electricity_amount,
    p_other_amount,
    null,
    p_total_amount,
    p_due_date,
    'unpaid',
    now()
  )
  returning id into v_bill_id;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_item_name := btrim(coalesce(v_item ->> 'item_name', ''));
    v_item_amount := nullif(v_item ->> 'amount', '')::numeric;

    if v_item_name = '' or v_item_amount is null or v_item_amount <= 0 then
      raise exception 'Invalid bill item';
    end if;

    insert into public.bill_items (bill_id, item_name, amount)
    values (v_bill_id, v_item_name, v_item_amount);
  end loop;

  return v_bill_id;
exception
  when unique_violation then
    raise exception 'A bill for this room and billing period already exists';
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_tenant_with_room(p_tenant_id uuid, p_room_id uuid, p_full_name text, p_phone text, p_move_in_date date, p_monthly_rent numeric, p_advance_rent_amount numeric, p_deposit_amount numeric, p_initial_electricity_meter numeric, p_occupant_count integer, p_note text, p_contract_file_path text, p_contract_original_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if trim(coalesce(p_full_name, '')) = '' then
    raise exception 'tenant name is required';
  end if;
  if p_move_in_date is null then
    raise exception 'move-in date is required';
  end if;
  if p_monthly_rent is null or p_monthly_rent <= 0 then
    raise exception 'monthly rent must be greater than zero';
  end if;
  if p_advance_rent_amount is null or p_advance_rent_amount < 0 then
    raise exception 'advance rent is required';
  end if;
  if p_deposit_amount is null or p_deposit_amount < 0 then
    raise exception 'deposit is required';
  end if;
  if p_initial_electricity_meter is not null and p_initial_electricity_meter < 0 then
    raise exception 'initial meter cannot be negative';
  end if;
  if p_occupant_count is null or p_occupant_count < 1 then
    raise exception 'occupant count must be at least one';
  end if;
  if exists (
    select 1 from public.tenants
    where room_id = p_room_id and is_active = true
  ) then
    raise exception 'room already has an active tenant';
  end if;

  insert into public.tenants (
    id, room_id, full_name, phone, move_in_date, is_active, note,
    advance_rent_amount, deposit_amount, initial_electricity_meter
  )
  values (
    p_tenant_id, p_room_id, trim(p_full_name), nullif(trim(coalesce(p_phone, '')), ''),
    p_move_in_date, true, nullif(trim(coalesce(p_note, '')), ''),
    p_advance_rent_amount, p_deposit_amount, p_initial_electricity_meter
  );

  update public.rooms
  set monthly_rent = p_monthly_rent,
      occupant_count = p_occupant_count,
      status = 'occupied',
      updated_at = now()
  where id = p_room_id;

  if not found then
    raise exception 'room not found';
  end if;

  if p_contract_file_path is not null and p_contract_original_name is not null then
    insert into public.contracts (
      tenant_id, room_id, contract_start, deposit_amount,
      file_path, original_file_name
    )
    values (
      p_tenant_id, p_room_id, p_move_in_date, p_deposit_amount,
      p_contract_file_path, p_contract_original_name
    );
  end if;

  return p_tenant_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_bill(p_token uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'room_code', r.room_code,
    'tenant_name', t.full_name,
    'billing_year', b.billing_year,
    'billing_month', b.billing_month,
    'rent_amount', b.rent_amount,
    'occupant_count', b.occupant_count,
    'water_rate_per_person', b.water_rate_per_person,
    'water_amount', b.water_amount,
    'previous_meter', b.previous_meter,
    'current_meter', b.current_meter,
    'electricity_units', b.electricity_units,
    'electricity_rate', b.electricity_rate,
    'electricity_amount', b.electricity_amount,
    'other_amount', b.other_amount,
    'total_amount', b.total_amount,
    'due_date', b.due_date,
    'status', b.status,
    'issued_at', b.issued_at,
    'paid_at', b.paid_at,
    'bill_items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'item_name', bi.item_name,
            'amount', bi.amount
          ) order by bi.created_at, bi.id
        )
        from public.bill_items bi
        where bi.bill_id = b.id
      ),
      '[]'::jsonb
    ),
    'payment_settings', (
      select jsonb_build_object(
        'bank_name', ps.bank_name,
        'bank_code', ps.bank_code,
        'account_name', ps.account_name,
        'account_number', ps.account_number
      )
      from public.payment_settings ps
      where ps.id = 'default'
      limit 1
    )
  )
  from public.bills b
  join public.rooms r on r.id = b.room_id
  left join public.tenants t on t.id = b.tenant_id
  where b.public_token = p_token
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.set_tenant_move_out_notice(p_tenant_id uuid, p_notice_date date, p_move_out_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_room_id uuid;
  v_prev_year integer;
  v_prev_month integer;
  v_monthly_rent numeric;
  v_year integer;
  v_month integer;
  v_restored integer := 0;
  v_adjusted integer := 0;
  v_skipped_paid integer := 0;
begin
  if p_notice_date is null or p_move_out_date is null then
    raise exception 'Notice date and move-out date are required';
  end if;

  if p_move_out_date < (p_notice_date + interval '1 month')::date then
    raise exception 'Move-out date must be at least one month after the notice date';
  end if;

  select room_id, rent_waived_year, rent_waived_month
  into v_room_id, v_prev_year, v_prev_month
  from public.tenants
  where id = p_tenant_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Active tenant not found';
  end if;

  if v_room_id is null then
    raise exception 'Tenant is not assigned to a room';
  end if;

  select monthly_rent
  into v_monthly_rent
  from public.rooms
  where id = v_room_id
  for update;

  v_year := extract(year from p_notice_date)::integer;
  v_month := extract(month from p_notice_date)::integer;

  -- Notice moved to another month: give the earlier month its rent back.
  if v_prev_year is not null
     and v_prev_month is not null
     and (v_prev_year, v_prev_month) is distinct from (v_year, v_month) then
    with restored_bills as (
      update public.bills
      set rent_amount = v_monthly_rent,
          total_amount = total_amount + v_monthly_rent,
          updated_at = now()
      where tenant_id = p_tenant_id
        and room_id = v_room_id
        and billing_year = v_prev_year
        and billing_month = v_prev_month
        and rent_amount = 0
        and status <> 'paid'
      returning id
    ),
    cleared_notifications as (
      delete from public.line_notification_logs notification
      using restored_bills restored
      where notification.bill_id = restored.id
      returning notification.id
    )
    select count(*)::integer into v_restored from restored_bills;
  end if;

  update public.tenants
  set termination_notice_date = p_notice_date,
      planned_move_out_date = p_move_out_date,
      rent_waived_year = v_year,
      rent_waived_month = v_month,
      updated_at = now()
  where id = p_tenant_id;

  with waived_bills as (
    update public.bills
    set total_amount = greatest(0, total_amount - rent_amount),
        rent_amount = 0,
        updated_at = now()
    where tenant_id = p_tenant_id
      and room_id = v_room_id
      and billing_year = v_year
      and billing_month = v_month
      and rent_amount > 0
      and status <> 'paid'
    returning id
  ),
  cleared_notifications as (
    delete from public.line_notification_logs notification
    using waived_bills waived
    where notification.bill_id = waived.id
    returning notification.id
  )
  select count(*)::integer into v_adjusted from waived_bills;

  select count(*)::integer
  into v_skipped_paid
  from public.bills
  where tenant_id = p_tenant_id
    and room_id = v_room_id
    and billing_year = v_year
    and billing_month = v_month
    and status = 'paid';

  return jsonb_build_object(
    'ok', true,
    'rentWaivedYear', v_year,
    'rentWaivedMonth', v_month,
    'adjustedBills', v_adjusted,
    'restoredBills', v_restored,
    'skippedPaidBills', v_skipped_paid
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_bill_status(p_bill_id uuid, p_new_status text, p_reason text)
 RETURNS bills
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_bill public.bills;
  v_old_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if p_new_status not in (
    'draft', 'unpaid', 'slip_submitted', 'verifying',
    'paid', 'overdue', 'rejected'
  ) then
    raise exception 'Invalid bill status: %', p_new_status;
  end if;

  if nullif(btrim(p_reason), '') is null then
    raise exception 'Reason is required';
  end if;

  select b.status
    into v_old_status
  from public.bills b
  where b.id = p_bill_id
  for update;

  if not found then
    raise exception 'Bill not found';
  end if;

  if v_old_status = p_new_status then
    raise exception 'New status must differ from current status';
  end if;

  update public.bills b
  set status = p_new_status,
      paid_at = case
        when p_new_status = 'paid' then coalesce(b.paid_at, now())
        when v_old_status = 'paid' and p_new_status <> 'paid' then null
        else b.paid_at
      end,
      updated_at = now()
  where b.id = p_bill_id
  returning b.* into v_bill;

  insert into public.bill_status_logs (
    bill_id, old_status, new_status, reason
  ) values (
    p_bill_id, v_old_status, p_new_status, btrim(p_reason)
  );

  return v_bill;
end;
$function$;

CREATE TRIGGER trg_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_calculate_bill BEFORE INSERT OR UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION calculate_bill();
