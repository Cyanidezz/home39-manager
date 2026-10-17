import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { addRoom, addTenant, createDatabase, errorOf, one, rows, type Db } from "./helpers";

const script = readFileSync(new URL("../../supabase/scripts/clear-room-data.sql", import.meta.url), "utf8");
const forRoom = (code: string) => script.replaceAll("ROOM_CODE", code);
const [, part1, part2] = forRoom("A").split(/-- =+ PART \d: [^\n]*\n/);

let db: Db;

async function seedRoom(code: string, withBill = true) {
  const roomId = await addRoom(db, code);
  const tenantId = await addTenant(db, roomId, { contractPath: `contracts/${code}.pdf`, contractName: "สัญญา.pdf" });
  if (withBill) {
    const bill = await one<{ id: string }>(
      db,
      `insert into bills (room_id, tenant_id, billing_year, billing_month, rent_amount, total_amount, status)
       values ($1,$2,2026,2,5000,5000,'paid') returning id`,
      [roomId, tenantId]
    );
    await db.query("insert into payments (bill_id, amount, slip_path) values ($1, 5000, $2)", [bill.id, `slips/${code}.jpg`]);
    await db.query("insert into bill_items (bill_id, name, amount) values ($1,'ค่าอื่น',100)", [bill.id]).catch(() => undefined);
  }
  return { roomId, tenantId };
}

beforeEach(async () => {
  db = await createDatabase();
});

describe("สคริปต์ล้างข้อมูลห้อง (supabase/scripts/clear-room-data.sql)", () => {
  it("ล้างผู้เช่า สัญญา บิล และสลิปของห้องที่เลือก เก็บตัวห้องไว้เป็นห้องว่าง และไม่แตะห้องอื่น", async () => {
    const a = await seedRoom("A");
    await seedRoom("B");

    await db.exec(part2);

    expect(await rows(db, "select 1 from tenants where room_id=$1", [a.roomId])).toHaveLength(0);
    expect(await rows(db, "select 1 from bills where room_id=$1", [a.roomId])).toHaveLength(0);
    expect(await one(db, "select count(*)::int n from payments p join bills b on b.id=p.bill_id where b.room_id=$1", [a.roomId])).toEqual({ n: 0 });
    expect(await one(db, "select count(*)::int n from contracts where room_id=$1 or tenant_id=$2", [a.roomId, a.tenantId])).toEqual({ n: 0 });
    expect(await one(db, "select status, occupant_count, monthly_rent::text rent from rooms where id=$1", [a.roomId])).toEqual({
      status: "vacant", occupant_count: 0, rent: "5000.00",
    });

    // room B is untouched
    expect(await one(db, "select count(*)::int n from tenants t join rooms r on r.id=t.room_id where r.room_code='B'")).toEqual({ n: 1 });
    expect(await one(db, "select count(*)::int n from bills b join rooms r on r.id=b.room_id where r.room_code='B'")).toEqual({ n: 1 });
    expect(await one(db, "select count(*)::int n from payments")).toEqual({ n: 1 });
  });

  it("ล้างผู้เช่าเก่าที่ย้ายออกแล้วของห้องนั้นด้วย และห้องที่ไม่มีข้อมูลก็ผ่านโดยไม่ error", async () => {
    const { roomId, tenantId } = await seedRoom("A");
    await db.query("select complete_tenant_move_out($1, '2026-03-01')", [tenantId]);
    await seedRoom("A2", false);
    await db.exec(part2);
    expect(await rows(db, "select 1 from tenants where room_id=$1", [roomId])).toHaveLength(0);

    await db.exec(forRoom("A2").split(/-- =+ PART \d: [^\n]*\n/)[2]); // nothing to delete in A2 beyond one tenant: still fine
    expect(await one(db, "select count(*)::int n from tenants")).toEqual({ n: 0 });
  });

  it("หยุดและยกเลิกทั้งหมดถ้ารหัสห้องไม่ตรงห้องไหน (หรือตรงหลายห้อง)", async () => {
    await seedRoom("A");
    const none = forRoom("ZZZ").split(/-- =+ PART \d: [^\n]*\n/)[2];
    expect(await errorOf(() => db.exec(none))).toContain("exactly one room");
    await db.exec("rollback").catch(() => undefined);
    expect(await one(db, "select count(*)::int n from tenants")).toEqual({ n: 1 });
  });

  it("พรีวิว (ส่วนที่ 1) นับจำนวนและแสดงไฟล์ใน Storage ที่ต้องลบเอง โดยไม่เปลี่ยนข้อมูล", async () => {
    await seedRoom("A");
    const results = await db.exec(part1);
    const summary = results[0].rows[0] as Record<string, number>;
    expect(summary).toMatchObject({ rooms_found: 1, tenants: 1, contracts: 1, bills: 1, payments_with_slips: 1 });
    expect(results[1].rows).toEqual([
      { kind: "contract", path: "contracts/A.pdf" },
      { kind: "payment slip", path: "slips/A.jpg" },
    ]);
    expect(await one(db, "select count(*)::int n from bills")).toEqual({ n: 1 });
  });
});
