import { beforeEach, describe, expect, it } from "vitest";
import { addBill, addRoom, addTenant, createDatabase, errorOf, one, rows, signIn, type Db } from "./helpers";

type Result = { ok: boolean; deposit: number; outstandingBills: number; totalDeductions: number; refund: number };

let db: Db;
let roomId: string;
let tenantId: string;

const complete = (date = "2026-05-01") => db.query("select complete_tenant_move_out($1,$2)", [tenantId, date]);
const save = async (
  o: { meter?: number | null; electricity?: number; water?: number; items?: { name: string; amount: number }[]; note?: string | null } = {},
  id = tenantId
) =>
  (
    await one<{ r: Result }>(db, "select save_move_out_settlement($1,$2,$3,$4,$5::jsonb,$6) r", [
      id, o.meter === undefined ? 160 : o.meter, o.electricity ?? 0, o.water ?? 0, JSON.stringify(o.items ?? []), o.note ?? null,
    ])
  ).r;
const close = async (expected: number, date: string | null, ref: string | null, slip: string | null, id = tenantId) =>
  (await one<{ r: { ok: boolean; refund: number; owed: number } }>(db, "select close_move_out_settlement($1,$2,$3,$4,$5) r", [id, expected, date, ref, slip])).r;
const settlement = () =>
  one<Record<string, string | null>>(
    db,
    `select status, deposit_amount::text deposit, electricity_amount::text electricity, water_amount::text water, items_amount::text items,
            outstanding_bills_amount::text outstanding, total_deductions::text deductions, refund_amount::text refund,
            refunded_on::text refunded_on, refund_reference ref, refund_slip_path slip, closed_at is not null closed
       from move_out_settlements where tenant_id=$1`,
    [tenantId]
  );
// Each bill continues from the previous reading (create_bill_with_items rejects a previous meter that does not).
let lastMeter = 100;
const bill = async (month: number, curr: number) => {
  const id = await addBill(db, roomId, tenantId, { year: 2026, month, prev: lastMeter, curr, rent: 5000, occupants: 2 });
  lastMeter = curr;
  return id;
};

beforeEach(async () => {
  db = await createDatabase();
  roomId = await addRoom(db, "A", { monthlyRent: 5000 });
  tenantId = await addTenant(db, roomId, { moveIn: "2026-01-01", rent: 5000, advance: 5000, deposit: 10000, meter: 100, occupants: 2 });
  lastMeter = 100;
  await signIn(db);
});

describe("7a. สรุปเงินมัดจำตอนย้ายออก (save_move_out_settlement)", () => {
  it("มัดจำ 10,000 หักค่าไฟ 280 ค่าน้ำ 300 ค่าเสียหาย 1,500+500 -> คืน 7,420", async () => {
    await complete();
    const r = await save({ meter: 140, electricity: 280, water: 300, items: [{ name: "ผนังมีรอย ทาสีใหม่", amount: 1500 }, { name: "ทำความสะอาด", amount: 500 }], note: "ตรวจห้องวันที่ 2 พ.ค." });

    expect(r).toEqual({ ok: true, deposit: 10000, outstandingBills: 0, totalDeductions: 2580, refund: 7420 });
    expect(await settlement()).toMatchObject({
      status: "open", deposit: "10000.00", electricity: "280.00", water: "300.00", items: "2000.00", deductions: "2580.00", refund: "7420.00",
    });
  });

  it("บิลที่ยังไม่จ่าย (ค้าง/เกินกำหนด/สลิปไม่ผ่าน) ถูกหักจากมัดจำ ส่วนบิลที่จ่ายแล้วและบิลร่างไม่ถูกนับ", async () => {
    const jan = await bill(1, 130);
    const feb = await bill(2, 160);
    const mar = await bill(3, 190);
    await db.query("update bills set status='paid' where id=$1", [jan]);
    await db.query("update bills set status='overdue' where id=$1", [feb]);
    await db.query("update bills set status='draft' where id=$1", [mar]);
    await complete();

    const r = await save({ electricity: 100 });
    const febTotal = Number((await one<{ t: string }>(db, "select total_amount::text t from bills where id=$1", [feb])).t);
    expect(r.outstandingBills).toBe(febTotal);
    expect(r.totalDeductions).toBe(100 + febTotal);
    expect(r.refund).toBe(10000 - 100 - febTotal);
  });

  it("มัดจำไม่พอหัก: ยอดคืนติดลบ = ผู้เช่ายังค้างชำระ", async () => {
    await complete();
    const r = await save({ items: [{ name: "เฟอร์นิเจอร์เสียหาย", amount: 12000 }] });
    expect(r.refund).toBe(-2000);
  });

  it("คำนวณใหม่ได้หลายรอบก่อนปิด (แก้ตัวเลข/รายการ) และไม่สร้างแถวซ้ำ", async () => {
    await complete();
    await save({ electricity: 500 });
    const r = await save({ electricity: 280, items: [{ name: "ค่าซ่อมประตู", amount: 700 }] });
    expect(r.refund).toBe(9020);
    expect(await one(db, "select count(*)::int n from move_out_settlements")).toEqual({ n: 1 });
  });

  it("ต้องย้ายออกแล้วเท่านั้น และตรวจข้อมูลที่กรอก", async () => {
    expect(await errorOf(() => save())).toContain("has not moved out");
    await complete();
    expect(await errorOf(() => save({ electricity: -1 }))).toContain("cannot be negative");
    expect(await errorOf(() => save({ items: [{ name: "  ", amount: 100 }] }))).toContain("needs a name");
    expect(await errorOf(() => save({ items: [{ name: "ค่าซ่อม", amount: 0 }] }))).toContain("above zero");
    expect(await errorOf(() => db.query("select save_move_out_settlement($1,1,0,0,'{}'::jsonb,null)", [tenantId]))).toContain("must be a list");
    expect(await errorOf(() => db.query("select save_move_out_settlement('00000000-0000-4000-8000-0000000000ff',1,0,0,'[]'::jsonb,null)"))).toContain("Tenant not found");
  });
});

describe("7b. ปิดยอดและโอนคืน (close_move_out_settlement)", () => {
  it("ปิดยอด: เก็บวันที่โอน เลขอ้างอิง และไฟล์สลิป; บิลค้างถูกตัดเป็นจ่ายแล้วพร้อมบันทึกเหตุผล", async () => {
    const feb = await bill(2, 160);
    await complete();
    const saved = await save({ electricity: 280, water: 300 });
    const r = await close(saved.refund, "2026-05-05", "REF123", "refund/A/slip.jpg");

    expect(r).toEqual({ ok: true, refund: saved.refund, owed: 0 });
    expect(await settlement()).toMatchObject({ status: "closed", refunded_on: "2026-05-05", ref: "REF123", slip: "refund/A/slip.jpg", closed: true });
    expect((await one<{ status: string }>(db, "select status from bills where id=$1", [feb])).status).toBe("paid");
    expect(await rows(db, "select old_status, new_status, reason from bill_status_logs where bill_id=$1", [feb])).toEqual([
      { old_status: "unpaid", new_status: "paid", reason: "หักจากเงินมัดจำตอนสรุปย้ายออก" },
    ]);
  });

  it("ยอดคืนเป็นบวกต้องมีวันที่โอน และสลิปหรือเลขอ้างอิงอย่างน้อยหนึ่งอย่าง", async () => {
    await complete();
    const { refund } = await save({ electricity: 280 });
    expect(await errorOf(() => close(refund, null, "REF", null))).toContain("Transfer date");
    expect(await errorOf(() => close(refund, "2026-05-05", null, null))).toContain("slip or a reference");
    expect(await errorOf(() => close(refund, "2026-05-05", "  ", null))).toContain("slip or a reference");
    expect((await settlement())!.status).toBe("open");
    expect(await close(refund, "2026-05-05", null, "refund/A/slip.pdf")).toMatchObject({ ok: true });
  });

  it("ยอดคืนเป็นศูนย์หรือติดลบ: ปิดได้โดยไม่ต้องมีการโอน และบอกจำนวนที่ผู้เช่ายังค้าง", async () => {
    await complete();
    const { refund } = await save({ items: [{ name: "เสียหาย", amount: 10500 }] });
    expect(refund).toBe(-500);
    expect(await close(refund, "2026-05-05", "ไม่ควรถูกเก็บ", "x.jpg")).toEqual({ ok: true, refund: -500, owed: 500 });
    expect(await settlement()).toMatchObject({ status: "closed", refunded_on: null, ref: null, slip: null });
  });

  it("ถ้ายอดเปลี่ยนหลังบันทึก (บิลที่เคยจ่ายแล้วถูกแก้กลับเป็นค้าง) ต้องไม่โอนยอดเดิม ให้บันทึกใหม่ก่อน", async () => {
    const feb = await bill(2, 160);
    await db.query("update bills set status='paid' where id=$1", [feb]);
    await complete();
    const { refund } = await save({ electricity: 100 });
    await db.query("update bills set status='unpaid' where id=$1", [feb]);
    expect(await errorOf(() => close(refund, "2026-05-05", "REF", null))).toContain("amounts changed");
    const again = await save({ electricity: 100 });
    expect(again.refund).toBeLessThan(refund);
    expect(await close(again.refund, "2026-05-05", "REF", null)).toMatchObject({ ok: true });
  });

  it("มีบิลที่รอตรวจสลิปอยู่ ต้องจัดการก่อนปิด", async () => {
    const feb = await bill(2, 160);
    await db.query("update bills set status='slip_submitted' where id=$1", [feb]);
    await complete();
    const { refund } = await save();
    expect(await errorOf(() => close(refund, "2026-05-05", "REF", null))).toContain("waiting for its payment slip");
  });

  it("ปิดแล้วแก้ไม่ได้ ปิดซ้ำไม่ได้ แต่เปิดกลับมาแก้ได้ (บิลที่หักไปแล้วยังเป็นจ่ายแล้ว)", async () => {
    const feb = await bill(2, 160);
    await complete();
    const { refund } = await save({ electricity: 280 });
    await close(refund, "2026-05-05", "REF", null);
    expect(await errorOf(() => save())).toContain("already closed");
    expect(await errorOf(() => close(refund, "2026-05-05", "REF", null))).toContain("already closed");

    await db.query("select reopen_move_out_settlement($1)", [tenantId]);
    expect(await settlement()).toMatchObject({ status: "open", refunded_on: null, ref: null, closed: false });
    expect((await one<{ status: string }>(db, "select status from bills where id=$1", [feb])).status).toBe("paid");
    const after = await save({ electricity: 280 });
    expect(after.outstandingBills).toBe(0);
    expect(await errorOf(() => db.query("select reopen_move_out_settlement($1)", [tenantId]))).toContain("No closed settlement");
  });

  it("ลบผู้เช่า = ลบใบสรุปด้วย และฟังก์ชันเขียนทั้งสามใช้ได้เฉพาะ service_role", async () => {
    await complete();
    await save();
    await db.query("delete from tenants where id=$1", [tenantId]).catch(async () => {
      await db.query("delete from bills where tenant_id=$1", [tenantId]);
      await db.query("delete from tenants where id=$1", [tenantId]);
    });
    expect(await one(db, "select count(*)::int n from move_out_settlements")).toEqual({ n: 0 });

    const grants = await rows<{ fn: string; role: string }>(
      db,
      `select p.proname fn, r.rolname role
         from pg_proc p cross join pg_roles r
        where p.proname in ('save_move_out_settlement','close_move_out_settlement','reopen_move_out_settlement')
          and r.rolname in ('anon','authenticated','service_role')
          and has_function_privilege(r.rolname, p.oid, 'execute')`
    );
    expect(grants.every((g) => g.role === "service_role")).toBe(true);
    expect(grants).toHaveLength(3);
  });
});
