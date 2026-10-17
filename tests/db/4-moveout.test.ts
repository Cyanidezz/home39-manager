import { beforeEach, describe, expect, it } from "vitest";
import { addBill, addRoom, addTenant, createDatabase, errorOf, getBill, getRoom, getTenant, one, rows, signIn, type Db } from "./helpers";

type NoticeResult = {
  ok: boolean;
  rentWaivedYear: number;
  rentWaivedMonth: number;
  adjustedBills: number;
  restoredBills: number;
  skippedPaidBills: number;
};

let db: Db;
let roomId: string;
let tenantId: string;

const notice = async (noticeDate: string, moveOutDate: string, id = tenantId) =>
  (await one<{ r: NoticeResult }>(db, "select set_tenant_move_out_notice($1,$2,$3) r", [id, noticeDate, moveOutDate])).r;
const cancel = async (id = tenantId) =>
  (await one<{ r: { ok: boolean; roomId: string; adjustedBills: number } }>(db, "select cancel_tenant_move_out($1) r", [id])).r;
const complete = async (date: string, id = tenantId) =>
  (await one<{ r: { ok: boolean; roomCode: string; moveOutDate: string } }>(db, "select complete_tenant_move_out($1,$2) r", [id, date])).r;
const setStatus = (billId: string, to: string, reason = "เหตุผล") =>
  db.query("select * from update_bill_status($1,$2,$3)", [billId, to, reason]);

/** A tenant who moved in on 2026-01-01, rent 5,000, with bills for Jan-Mar already issued. */
async function bill(month: number, prev: number, curr: number, year = 2026) {
  return addBill(db, roomId, tenantId, { year, month, prev, curr, rent: 5000, occupants: 2 });
}

beforeEach(async () => {
  db = await createDatabase();
  roomId = await addRoom(db, "A", { monthlyRent: 5000 });
  tenantId = await addTenant(db, roomId, { moveIn: "2026-01-01", rent: 5000, advance: 5000, deposit: 10000, meter: 100, occupants: 2 });
  await signIn(db);
});

describe("4a. แจ้งย้ายออก (set_tenant_move_out_notice)", () => {
  it("เดือนที่แจ้ง: ตัดค่าเช่าเป็น 0 เฉพาะบิลที่ยังไม่จ่าย ยอดรวมลดลงเท่าค่าเช่า และบันทึกเดือนที่ใช้ค่าเช่าล่วงหน้า", async () => {
    const mar = await bill(3, 100, 130); // 5000 + 300 + 210 = 5510
    expect((await getBill(db, mar)).total_amount).toBe("5510.00");

    const result = await notice("2026-03-10", "2026-04-15");
    expect(result).toEqual({ ok: true, rentWaivedYear: 2026, rentWaivedMonth: 3, adjustedBills: 1, restoredBills: 0, skippedPaidBills: 0 });
    expect(await getBill(db, mar)).toMatchObject({ rent_amount: "0.00", total_amount: "510.00", status: "unpaid" });
    expect(await getTenant(db, tenantId)).toMatchObject({
      is_active: true, termination_notice_date: "2026-03-10", planned_move_out_date: "2026-04-15",
      rent_waived_year: 2026, rent_waived_month: 3,
    });
  });

  it("บิลของเดือนอื่นไม่ถูกแตะ", async () => {
    const feb = await bill(2, 100, 120);
    const mar = await bill(3, 120, 140);
    const apr = await bill(4, 140, 150);
    await notice("2026-03-10", "2026-04-15");
    expect((await getBill(db, feb)).rent_amount).toBe("5000.00");
    expect((await getBill(db, mar)).rent_amount).toBe("0.00");
    expect((await getBill(db, apr)).rent_amount).toBe("5000.00");
  });

  it("บิลที่จ่ายแล้วไม่ถูกแก้ยอด แต่นับใน skippedPaidBills", async () => {
    const mar = await bill(3, 100, 130);
    await setStatus(mar, "paid");
    const before = await getBill(db, mar);
    const result = await notice("2026-03-10", "2026-04-15");
    expect(result).toMatchObject({ adjustedBills: 0, skippedPaidBills: 1 });
    expect(await getBill(db, mar)).toEqual(before);
  });

  it("ล้างประวัติแจ้งเตือน LINE ของบิลที่ถูกแก้ เพื่อให้ระบบส่งใหม่", async () => {
    const mar = await bill(3, 100, 130);
    await db.query("insert into line_notification_logs (bill_id, notification_type) values ($1, 'due_3_days')", [mar]);
    await notice("2026-03-10", "2026-04-15");
    expect((await rows(db, "select 1 from line_notification_logs where bill_id=$1", [mar])).length).toBe(0);
  });

  it("ส่งซ้ำเดือนเดิม: ไม่ลดค่าเช่าซ้ำ (idempotent)", async () => {
    const mar = await bill(3, 100, 130);
    await notice("2026-03-10", "2026-04-15");
    const second = await notice("2026-03-20", "2026-04-25");
    expect(second).toMatchObject({ adjustedBills: 0, restoredBills: 0 });
    expect(await getBill(db, mar)).toMatchObject({ rent_amount: "0.00", total_amount: "510.00" });
    expect(await getTenant(db, tenantId)).toMatchObject({ termination_notice_date: "2026-03-20", planned_move_out_date: "2026-04-25" });
  });

  it("เปลี่ยนเดือนที่แจ้ง: คืนค่าเช่าเดือนเดิม (เฉพาะบิลที่ยังไม่จ่าย) แล้วตัดเดือนใหม่", async () => {
    const mar = await bill(3, 100, 130);
    const apr = await bill(4, 130, 140);
    await notice("2026-03-10", "2026-04-15");
    const moved = await notice("2026-04-02", "2026-05-10");
    expect(moved).toMatchObject({ rentWaivedMonth: 4, adjustedBills: 1, restoredBills: 1 });
    expect(await getBill(db, mar)).toMatchObject({ rent_amount: "5000.00", total_amount: "5510.00" });
    expect(await getBill(db, apr)).toMatchObject({ rent_amount: "0.00" });
  });

  it("เปลี่ยนเดือนที่แจ้ง: บิลเดือนเดิมที่จ่ายแล้วไม่ถูกเปลี่ยน", async () => {
    const mar = await bill(3, 100, 130);
    await notice("2026-03-10", "2026-04-15"); // mar waived: rent 0, total 510
    await setStatus(mar, "paid"); // tenant paid the waived (510) bill
    const moved = await notice("2026-04-02", "2026-05-10");
    expect(moved.restoredBills).toBe(0);
    expect(await getBill(db, mar)).toMatchObject({ rent_amount: "0.00", total_amount: "510.00", status: "paid" });
  });

  it("ข้ามปี: แจ้งเดือนธันวาคม แล้วเปลี่ยนเป็นมกราคมปีถัดไป คืนค่าเช่าธันวาคม", async () => {
    const dec = await bill(12, 100, 110, 2026);
    await notice("2026-12-20", "2027-01-25");
    expect((await getBill(db, dec)).rent_amount).toBe("0.00");
    const jan = await bill(1, 110, 120, 2027);
    const moved = await notice("2027-01-05", "2027-02-10");
    expect(moved).toMatchObject({ rentWaivedYear: 2027, rentWaivedMonth: 1, restoredBills: 1, adjustedBills: 1 });
    expect((await getBill(db, dec)).rent_amount).toBe("5000.00");
    expect((await getBill(db, jan)).rent_amount).toBe("0.00");
  });

  it("วันย้ายออกต้องห่างจากวันแจ้งอย่างน้อย 1 เดือน (รวมกรณีสิ้นเดือน 31 ม.ค. -> 28 ก.พ.)", async () => {
    expect(await errorOf(() => notice("2026-03-10", "2026-04-09"))).toMatch(/at least one month/i);
    expect(await notice("2026-03-10", "2026-04-10")).toMatchObject({ ok: true });
    // Postgres clamps Jan 31 + 1 month to Feb 28 (same rule as addOneMonth in src/lib/format.ts)
    expect(await errorOf(() => notice("2026-01-31", "2026-02-27"))).toMatch(/at least one month/i);
    expect(await notice("2026-01-31", "2026-02-28")).toMatchObject({ ok: true });
  });

  it("ปฏิเสธวันที่ว่าง, ผู้เช่าที่ไม่มี/ไม่ active, ผู้เช่าที่ไม่ผูกห้อง", async () => {
    expect(await errorOf(() => db.query("select set_tenant_move_out_notice($1,null,null)", [tenantId]))).toMatch(/required/i);
    expect(await errorOf(() => notice("2026-03-10", "2026-04-15", "00000000-0000-4000-8000-0000000000ee"))).toMatch(/Active tenant not found/i);
    await complete("2026-02-01");
    expect(await errorOf(() => notice("2026-03-10", "2026-04-15"))).toMatch(/Active tenant not found/i);
  });

  it("ผู้เช่าที่ room_id เป็น null ถูกปฏิเสธ", async () => {
    await db.query("update tenants set room_id = null where id=$1", [tenantId]);
    expect(await errorOf(() => notice("2026-03-10", "2026-04-15"))).toMatch(/not assigned to a room/i);
  });

  it("ค่าเช่าที่ปรับใช้เฉพาะบิลของผู้เช่าคนนี้ (ผู้เช่าคนเก่าของห้องเดียวกันไม่ถูกแตะ)", async () => {
    const oldBill = await bill(3, 100, 130);
    await complete("2026-03-31"); // tenant 1 leaves
    const second = await addTenant(db, roomId, { moveIn: "2026-04-01", meter: 130 });
    const newBill = await addBill(db, roomId, second, { year: 2026, month: 4, prev: 130, curr: 140 });
    await notice("2026-04-05", "2026-05-10", second);
    expect((await getBill(db, oldBill)).rent_amount).toBe("5000.00");
    expect((await getBill(db, newBill)).rent_amount).toBe("0.00");
  });
});

describe("4b. ยกเลิกการแจ้งย้ายออก (cancel_tenant_move_out)", () => {
  it("คืนค่าเช่าของบิลเดือนที่ตัดไว้ เคลียร์วันแจ้ง/ย้ายออก และห้องกลับเป็น occupied", async () => {
    const mar = await bill(3, 100, 130);
    await notice("2026-03-10", "2026-04-15");
    expect(await cancel()).toMatchObject({ ok: true, roomId, adjustedBills: 1 });
    expect(await getBill(db, mar)).toMatchObject({ rent_amount: "5000.00", total_amount: "5510.00" });
    expect(await getTenant(db, tenantId)).toMatchObject({
      termination_notice_date: null, planned_move_out_date: null, rent_waived_year: null, rent_waived_month: null, is_active: true,
    });
    expect((await getRoom(db, roomId)).status).toBe("occupied");
  });

  it("ยกเลิกโดยไม่เคยแจ้ง: ไม่ error และไม่แตะบิลใด ๆ", async () => {
    const mar = await bill(3, 100, 130);
    expect(await cancel()).toMatchObject({ ok: true, adjustedBills: 0 });
    expect((await getBill(db, mar)).rent_amount).toBe("5000.00");
  });

  // BUG (Medium): cancel_tenant_move_out restores rent on EVERY bill of the waived month whose rent is 0, including
  // bills already PAID. set_tenant_move_out_notice deliberately never touches paid bills, so a tenant who paid the
  // waived (cheaper) bill gets a paid bill whose total silently jumps back up by a month's rent.
  it.fails("BUG: ยกเลิกการแจ้งย้ายออกต้องไม่แก้ยอดบิลที่จ่ายแล้ว", async () => {
    const mar = await bill(3, 100, 130);
    await notice("2026-03-10", "2026-04-15");
    await setStatus(mar, "paid");
    await cancel();
    expect(await getBill(db, mar)).toMatchObject({ rent_amount: "0.00", total_amount: "510.00", status: "paid" });
  });

  it("ล้างประวัติแจ้งเตือน LINE ของบิลที่คืนค่าเช่า", async () => {
    const mar = await bill(3, 100, 130);
    await notice("2026-03-10", "2026-04-15");
    await db.query("insert into line_notification_logs (bill_id, notification_type) values ($1, 'due_3_days')", [mar]);
    await cancel();
    expect((await rows(db, "select 1 from line_notification_logs where bill_id=$1", [mar])).length).toBe(0);
  });
});

describe("4c. ผู้เช่าย้ายออกจริง (complete_tenant_move_out)", () => {
  it("ผู้เช่า inactive + มีวันย้ายออก, ห้องว่างและผู้พัก 0 คน, สัญญาล่าสุดสิ้นสุดวันเดียวกัน", async () => {
    const contractRoomId = await addRoom(db, "C");
    const t = await addTenant(db, contractRoomId, { contractPath: "contracts/c.pdf", contractName: "c.pdf", moveIn: "2026-01-01" });
    expect(await complete("2026-06-30", t)).toMatchObject({ ok: true, roomCode: "C", moveOutDate: "2026-06-30" });
    expect(await getTenant(db, t)).toMatchObject({ is_active: false, move_out_date: "2026-06-30" });
    expect(await getRoom(db, contractRoomId)).toMatchObject({ status: "vacant", occupant_count: 0 });
    expect((await one<{ d: string }>(db, "select contract_end::text d from contracts where tenant_id=$1", [t])).d).toBe("2026-06-30");
  });

  it("ห้องที่ไม่มีสัญญาก็ย้ายออกได้", async () => {
    expect(await complete("2026-06-30")).toMatchObject({ ok: true });
    expect((await getRoom(db, roomId)).status).toBe("vacant");
  });

  it("ปฏิเสธวันที่ว่าง, ก่อนวันเข้าพัก, ก่อนวันที่แจ้ง", async () => {
    expect(await errorOf(() => db.query("select complete_tenant_move_out($1,null)", [tenantId]))).toMatch(/required/i);
    expect(await errorOf(() => complete("2025-12-31"))).toMatch(/before move-in/i);
    await notice("2026-03-10", "2026-04-15");
    expect(await errorOf(() => complete("2026-03-09"))).toMatch(/before notice/i);
    expect(await complete("2026-04-15")).toMatchObject({ ok: true });
  });

  it("ย้ายออกซ้ำเป็นครั้งที่สอง: ปฏิเสธ ไม่เปลี่ยนวันย้ายออกเดิม", async () => {
    await complete("2026-06-30");
    expect(await errorOf(() => complete("2026-07-15"))).toMatch(/Active tenant not found/i);
    expect((await getTenant(db, tenantId)).move_out_date).toBe("2026-06-30");
  });

  it("ย้ายออกขณะมีบิลค้างจ่าย: บิลเดิมคงอยู่ครบ (ไม่ถูกลบ/แก้)", async () => {
    const mar = await bill(3, 100, 130);
    await complete("2026-03-31");
    expect(await getBill(db, mar)).toMatchObject({ status: "unpaid", total_amount: "5510.00" });
  });

  // BUG (Low): moving out does not settle or flag unpaid bills, and the deposit (tenants.deposit_amount) stays on the
  // closed tenant row with no refund/forfeit record. Documented as a gap rather than asserted as a failure.
  it("บันทึกสถานะปัจจุบัน: เงินมัดจำยังค้างอยู่ในแถวผู้เช่าที่ปิดแล้ว", async () => {
    await complete("2026-03-31");
    expect((await one<{ d: string }>(db, "select deposit_amount::text d from tenants where id=$1", [tenantId])).d).toBe("10000");
  });
});
