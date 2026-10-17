import { beforeEach, describe, expect, it } from "vitest";
import { addBill, addRoom, addTenant, createDatabase, errorOf, getBill, getRoom, getTenant, one, rows, signIn, type Db } from "./helpers";

let db: Db;

const setStatus = (billId: string, to: string, reason = "เหตุผล") =>
  db.query("select * from update_bill_status($1,$2,$3)", [billId, to, reason]);
const notice = (tenantId: string, noticeDate: string, moveOutDate: string) =>
  one<{ r: { adjustedBills: number; restoredBills: number; skippedPaidBills: number } }>(
    db, "select set_tenant_move_out_notice($1,$2,$3) r", [tenantId, noticeDate, moveOutDate]
  ).then((row) => row.r);
const complete = (tenantId: string, date: string) => db.query("select complete_tenant_move_out($1,$2)", [tenantId, date]);

beforeEach(async () => {
  db = await createDatabase();
  await signIn(db);
});

describe("5a. ห้องกลับมาให้เช่าใหม่หลังผู้เช่าย้ายออก", () => {
  it("สร้างผู้เช่าคนใหม่ในห้องเดิมได้ ห้องกลับเป็น occupied และมี active แค่คนเดียว", async () => {
    const roomId = await addRoom(db, "A");
    const first = await addTenant(db, roomId, { name: "คนแรก", moveIn: "2026-01-01", occupants: 2 });
    await complete(first, "2026-03-31");
    expect(await getRoom(db, roomId)).toMatchObject({ status: "vacant", occupant_count: 0 });

    const second = await addTenant(db, roomId, { name: "คนที่สอง", moveIn: "2026-04-01", occupants: 1, meter: 135 });
    expect(await getRoom(db, roomId)).toMatchObject({ status: "occupied", occupant_count: 1 });
    expect((await rows(db, "select id from tenants where room_id=$1 and is_active", [roomId])).map((r) => (r as { id: string }).id)).toEqual([second]);
    expect(await getTenant(db, first)).toMatchObject({ is_active: false, move_out_date: "2026-03-31" });
  });

  it("ประวัติของผู้เช่าคนเก่า (บิล บิลรายการ log สัญญา) อยู่ครบและไม่ปนกับคนใหม่", async () => {
    const roomId = await addRoom(db, "A");
    const first = await addTenant(db, roomId, { name: "คนแรก", moveIn: "2026-01-01", contractPath: "contracts/1.pdf", contractName: "1.pdf" });
    const bill = await addBill(db, roomId, first, { year: 2026, month: 3, prev: 100, curr: 130, items: [{ item_name: "กุญแจ", amount: 100 }] });
    await setStatus(bill, "paid", "รับเงินสด");
    await complete(first, "2026-03-31");

    const second = await addTenant(db, roomId, { name: "คนที่สอง", moveIn: "2026-04-01", contractPath: "contracts/2.pdf", contractName: "2.pdf" });
    await addBill(db, roomId, second, { year: 2026, month: 4, prev: 130, curr: 140 });

    expect((await rows(db, "select 1 from bills where tenant_id=$1", [first])).length).toBe(1);
    expect((await rows(db, "select 1 from bill_items where bill_id=$1", [bill])).length).toBe(1);
    expect((await rows(db, "select 1 from bill_status_logs where bill_id=$1", [bill])).length).toBe(1);
    expect(await getBill(db, bill)).toMatchObject({ status: "paid", total_amount: "5610.00" });
    expect((await one<{ d: string }>(db, "select contract_end::text d from contracts where tenant_id=$1", [first])).d).toBe("2026-03-31");
    expect((await one<{ d: string | null }>(db, "select contract_end::text d from contracts where tenant_id=$1", [second])).d).toBeNull();
  });

  it("ผู้เช่าใหม่เริ่มคิดค่าไฟจากมิเตอร์ตอนเข้าอยู่ของตัวเอง (ข้อมูลแถวต่อผู้เช่า)", async () => {
    const roomId = await addRoom(db, "A");
    const first = await addTenant(db, roomId, { moveIn: "2026-01-01", meter: 100 });
    await addBill(db, roomId, first, { year: 2026, month: 3, prev: 100, curr: 130 });
    await complete(first, "2026-03-31");
    const second = await addTenant(db, roomId, { moveIn: "2026-04-01", meter: 135 });

    // The same two lookups fetchBillingContext makes: tenant-scoped latest bill, then the move-in reading.
    const tenantLatest = await one<{ m: string | null }>(
      db, "select current_meter::text m from bills where room_id=$1 and tenant_id=$2 and current_meter is not null order by billing_year desc, billing_month desc limit 1", [roomId, second]
    );
    expect(tenantLatest).toBeUndefined();
    const roomLatest = await one<{ m: string }>(
      db, "select current_meter::text m from bills where room_id=$1 and current_meter is not null order by billing_year desc, billing_month desc limit 1", [roomId]
    );
    expect(roomLatest.m).toBe("130.00"); // old tenant's last reading: must NOT be used when the new tenant has their own 135
    expect((await one<{ m: string }>(db, "select initial_electricity_meter::text m from tenants where id=$1", [second])).m).toBe("135");
  });

  // Documented limitation (not a bug in the SQL): one bill per room per month.
  it("เปลี่ยนผู้เช่ากลางเดือน: ออกบิลที่สองของห้องในเดือนเดียวกันไม่ได้ (unique room+เดือน)", async () => {
    const roomId = await addRoom(db, "A");
    const first = await addTenant(db, roomId, { moveIn: "2026-01-01", meter: 100 });
    await addBill(db, roomId, first, { year: 2026, month: 3, prev: 100, curr: 130 });
    await complete(first, "2026-03-15");
    const second = await addTenant(db, roomId, { moveIn: "2026-03-16", meter: 130 });
    const error = await errorOf(() => addBill(db, roomId, second, { year: 2026, month: 3, prev: 130, curr: 140 }));
    expect(error).toMatch(/already exists|duplicate|unique/i);
    // ...and the next month works
    expect(await addBill(db, roomId, second, { year: 2026, month: 4, prev: 130, curr: 140 })).toBeTruthy();
  });

  it("ย้ายออกแล้ว ผู้เช่าเก่าแจ้ง/ยกเลิกการย้ายออกอีกไม่ได้ และไม่มีผลกับผู้เช่าใหม่", async () => {
    const roomId = await addRoom(db, "A");
    const first = await addTenant(db, roomId, { moveIn: "2026-01-01" });
    await complete(first, "2026-03-31");
    const second = await addTenant(db, roomId, { moveIn: "2026-04-01" });
    expect(await errorOf(() => notice(first, "2026-04-05", "2026-05-10"))).toMatch(/Active tenant not found/i);
    expect(await errorOf(() => db.query("select cancel_tenant_move_out($1)", [first]))).toMatch(/Active tenant not found/i);
    expect(await getTenant(db, second)).toMatchObject({ termination_notice_date: null, is_active: true });
    expect((await getRoom(db, roomId)).status).toBe("occupied");
  });
});

describe("5b. วงจรเต็ม ตั้งแต่เริ่มเช่าจนย้ายออก", () => {
  it("เริ่มเช่า -> 3 เดือนของบิล -> จ่าย/ตีกลับ -> แจ้งย้ายออก -> เปลี่ยนใจ -> แจ้งใหม่ -> ย้ายออก -> ให้เช่าใหม่", async () => {
    const roomId = await addRoom(db, "A", { monthlyRent: 5000 });
    const tenant = await addTenant(db, roomId, { moveIn: "2026-01-01", rent: 5000, advance: 5000, deposit: 10000, meter: 100, occupants: 2 });
    expect(await getRoom(db, roomId)).toMatchObject({ status: "occupied", occupant_count: 2 });

    // Jan: 20 units  -> 5000 + 300 + 140
    const jan = await addBill(db, roomId, tenant, { year: 2026, month: 1, prev: 100, curr: 120 });
    // Feb: 30 units  -> 5000 + 300 + 210
    const feb = await addBill(db, roomId, tenant, { year: 2026, month: 2, prev: 120, curr: 150 });
    // Mar: 10 units  -> 5000 + 300 + 70
    const mar = await addBill(db, roomId, tenant, { year: 2026, month: 3, prev: 150, curr: 160 });
    expect([(await getBill(db, jan)).total_amount, (await getBill(db, feb)).total_amount, (await getBill(db, mar)).total_amount]).toEqual([
      "5440.00", "5510.00", "5370.00",
    ]);

    // Jan paid after a slip was submitted and checked; Feb slip rejected, then paid.
    await setStatus(jan, "slip_submitted", "ส่งสลิป");
    await setStatus(jan, "verifying", "ตรวจสลิป");
    await setStatus(jan, "paid", "ยืนยันชำระ");
    await setStatus(feb, "slip_submitted", "ส่งสลิป");
    await setStatus(feb, "rejected", "สลิปไม่ชัด");
    await setStatus(feb, "slip_submitted", "ส่งใหม่");
    await setStatus(feb, "paid", "ยืนยันชำระ");
    expect((await getBill(db, jan)).paid_at).not.toBeNull();
    expect((await rows(db, "select 1 from bill_status_logs where bill_id=$1", [feb])).length).toBe(4);

    // Notice in March: March (unpaid) rent waived, paid Jan/Feb untouched.
    expect(await notice(tenant, "2026-03-10", "2026-04-15")).toEqual({ ok: true, rentWaivedYear: 2026, rentWaivedMonth: 3, adjustedBills: 1, restoredBills: 0, skippedPaidBills: 0 });
    expect((await getBill(db, mar)).total_amount).toBe("370.00");

    // Changes mind, then gives a new notice in April.
    await db.query("select cancel_tenant_move_out($1)", [tenant]);
    expect((await getBill(db, mar)).total_amount).toBe("5370.00");
    const apr = await addBill(db, roomId, tenant, { year: 2026, month: 4, prev: 160, curr: 170 });
    await setStatus(mar, "paid", "ชำระแล้ว");
    expect(await notice(tenant, "2026-04-02", "2026-05-10")).toMatchObject({ adjustedBills: 1, restoredBills: 0 });
    expect((await getBill(db, apr)).rent_amount).toBe("0.00");
    expect((await getBill(db, mar)).total_amount).toBe("5370.00"); // paid, untouched

    // Moves out; the room can be let again and old data is intact.
    await complete(tenant, "2026-05-10");
    expect(await getRoom(db, roomId)).toMatchObject({ status: "vacant", occupant_count: 0 });
    const next = await addTenant(db, roomId, { name: "คนใหม่", moveIn: "2026-05-15", meter: 175, occupants: 1 });
    expect(await getRoom(db, roomId)).toMatchObject({ status: "occupied", occupant_count: 1 });
    expect((await rows(db, "select 1 from bills where tenant_id=$1", [tenant])).length).toBe(4);
    expect((await rows(db, "select 1 from bills where tenant_id=$1", [next])).length).toBe(0);
  });
});
