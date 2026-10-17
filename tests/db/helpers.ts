import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const baseline = readFileSync(new URL("./baseline.sql", import.meta.url), "utf8");

/** Supabase pieces the SQL functions rely on, stubbed for a plain Postgres. */
const supabaseStubs = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text);
  alter table storage.objects enable row level security;
`;

/**
 * Migrations newer than baseline.sql. The baseline is regenerated from the project after a migration has been applied
 * there (see README), so until then the test database applies the migration itself; once the baseline contains the
 * objects the file is skipped. Add a migration here when it adds tables or functions the tests use.
 */
const pendingMigrations = [
  { file: "20261018090000_move_out_settlement.sql", marker: "public.move_out_settlements" },
].map(({ file, marker }) => ({
  marker,
  sql: readFileSync(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"),
}));

let shared: PGlite | undefined;

/**
 * An in-memory database with the production schema and no rows.
 * Loading the schema takes seconds, so each test file loads it once and every call wipes the data
 * and signs out again; tests must not rely on data or session state left by earlier tests.
 */
export async function createDatabase() {
  if (!shared) {
    shared = new PGlite();
    await shared.exec(supabaseStubs);
    await shared.exec(baseline);
    for (const { marker, sql } of pendingMigrations) {
      const present = await shared.query<{ found: string | null }>("select to_regclass($1) as found", [marker]);
      if (!present.rows[0].found) await shared.exec(sql);
    }
  }
  const tables = await shared.query<{ tablename: string }>("select tablename from pg_tables where schemaname = 'public'");
  await shared.exec(
    `truncate ${tables.rows.map((row) => `public."${row.tablename}"`).join(", ")} restart identity cascade;
     select set_config('request.jwt.claim.sub', '', false);`
  );
  return shared;
}

/** Act as a signed-in admin for functions that call auth.uid(). */
export async function signIn(db: PGlite, userId = "00000000-0000-4000-8000-0000000000aa") {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
}

export type Db = PGlite;

// ---------------------------------------------------------------------------
// Lifecycle helpers shared by the tests in this folder.
// ---------------------------------------------------------------------------

let counter = 0;
const nextId = () => {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
};

/** Runs a query and returns all rows (numerics/dates are cast to text by the caller). */
export async function rows<T = Record<string, unknown>>(db: Db, sql: string, params: unknown[] = []) {
  return (await db.query<T>(sql, params)).rows;
}

/** Runs a query and returns the first row. */
export async function one<T = Record<string, unknown>>(db: Db, sql: string, params: unknown[] = []) {
  return (await rows<T>(db, sql, params))[0];
}

/** Message of the error thrown by `fn`, or null when it did not throw. */
export async function errorOf(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function addRoom(db: Db, roomCode = "A", overrides: { status?: string; monthlyRent?: number; occupantCount?: number } = {}) {
  const id = nextId();
  await db.query(
    "insert into rooms (id, room_code, monthly_rent, occupant_count, status) values ($1,$2,$3,$4,$5)",
    [id, roomCode, overrides.monthlyRent ?? 5000, overrides.occupantCount ?? 0, overrides.status ?? "vacant"]
  );
  return id;
}

export type TenantArgs = {
  id?: string;
  name?: string;
  phone?: string | null;
  moveIn?: string;
  rent?: number;
  advance?: number;
  deposit?: number;
  meter?: number | null;
  occupants?: number;
  note?: string | null;
  contractPath?: string | null;
  contractName?: string | null;
};

/** Calls create_tenant_with_room the way TenantForm does. */
export async function addTenant(db: Db, roomId: string, a: TenantArgs = {}) {
  const id = a.id ?? nextId();
  await db.query("select create_tenant_with_room($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [
    id,
    roomId,
    a.name ?? "สมชาย ใจดี",
    a.phone === undefined ? "0812345678" : a.phone,
    a.moveIn ?? "2026-01-01",
    a.rent ?? 5000,
    a.advance ?? 5000,
    a.deposit ?? 10000,
    a.meter === undefined ? 100 : a.meter,
    a.occupants ?? 2,
    a.note === undefined ? null : a.note,
    a.contractPath === undefined ? null : a.contractPath,
    a.contractName === undefined ? null : a.contractName,
  ]);
  return id;
}

export type BillArgs = {
  year: number;
  month: number;
  rent?: number;
  occupants?: number;
  prev: number;
  curr: number;
  items?: { item_name: string; amount: number }[];
  /** Overrides what BillForm would compute, to prove the DB does not trust it. */
  total?: number;
  water?: number;
  electricityAmount?: number;
  other?: number;
  rate?: number;
  dueDate?: string | null;
};

/** Calls create_bill_with_items the way BillForm does (client-side totals included). */
export async function addBill(db: Db, roomId: string, tenantId: string, a: BillArgs) {
  const occupants = a.occupants ?? 2;
  const rent = a.rent ?? 5000;
  const rate = a.rate ?? 7;
  const items = a.items ?? [];
  const other = a.other ?? items.reduce((s, i) => s + i.amount, 0);
  const water = a.water ?? occupants * 150;
  const units = Math.max(0, a.curr - a.prev);
  const electricity = a.electricityAmount ?? units * rate;
  const total = a.total ?? rent + water + electricity + other;
  const result = await db.query<{ create_bill_with_items: string }>(
    "select create_bill_with_items($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)",
    [
      roomId, tenantId, a.year, a.month, rent, occupants, 150, water, a.prev, a.curr, units, rate,
      electricity, other, total, a.dueDate === undefined ? null : a.dueDate, JSON.stringify(items),
    ]
  );
  return result.rows[0].create_bill_with_items;
}

export async function getBill(db: Db, billId: string) {
  return one<{
    rent_amount: string; water_amount: string; electricity_units: string; electricity_amount: string;
    other_amount: string; total_amount: string; status: string; paid_at: string | null;
    previous_meter: string; current_meter: string;
  }>(db, "select rent_amount::text, water_amount::text, electricity_units::text, electricity_amount::text, other_amount::text, total_amount::text, status, paid_at::text, previous_meter::text, current_meter::text from bills where id=$1", [billId]);
}

export async function getTenant(db: Db, tenantId: string) {
  return one<{
    is_active: boolean; move_out_date: string | null; termination_notice_date: string | null;
    planned_move_out_date: string | null; rent_waived_year: number | null; rent_waived_month: number | null;
  }>(db, "select is_active, move_out_date::text, termination_notice_date::text, planned_move_out_date::text, rent_waived_year, rent_waived_month from tenants where id=$1", [tenantId]);
}

export async function getRoom(db: Db, roomId: string) {
  return one<{ status: string; occupant_count: number; monthly_rent: string }>(
    db, "select status, occupant_count, monthly_rent::text from rooms where id=$1", [roomId]
  );
}
