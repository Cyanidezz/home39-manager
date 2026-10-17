import { beforeEach, describe, expect, it } from "vitest";
import { addBill, addRoom, addTenant, createDatabase, errorOf, getBill, one, rows, signIn, type Db } from "./helpers";

let db: Db;
let roomId: string;
let tenantId: string;

beforeEach(async () => {
  db = await createDatabase();
  roomId = await addRoom(db, "A");
  tenantId = await addTenant(db, roomId, { rent: 5000, occupants: 2, meter: 100 });
  await signIn(db);
});

describe("2. ออกบิลรายเดือน (create_bill_with_items + trigger calculate_bill)", () => {
  it("บิลปกติ: ค่าเช่า 5000 + น้ำ 2 คน x 150 + ไฟ 20 หน่วย x 7 + อื่น ๆ 200+50 = 5690", async () => {
    const billId = await addBill(db, roomId, tenantId, {
      year: 2026, month: 2, prev: 100, curr: 120,
      items: [{ item_name: "ค่าส่วนกลาง", amount: 200 }, { item_name: "ค่าปรับ", amount: 50 }],
      dueDate: "2026-02-10",
    });
    expect(await getBill(db, billId)).toMatchObject({
      rent_amount: "5000.00", water_amount: "300.00", electricity_units: "20.00",
      electricity_amount: "140.00", other_amount: "250.00", total_amount: "5690.00",
      status: "unpaid", paid_at: null, previous_meter: "100.00", current_meter: "120.00",
    });
    const meta = await one<{ issued: boolean; token: string; due: string; tenant_ok: boolean }>(
      db, "select issued_at is not null issued, public_token::text token, due_date::text due, tenant_id = $2 tenant_ok from bills where id=$1", [billId, tenantId]
    );
    expect(meta.issued).toBe(true);
    expect(meta.due).toBe("2026-02-10");
    expect(meta.tenant_ok).toBe(true);
    expect(meta.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(
      await rows(db, "select item_name, amount::text amount from bill_items where bill_id=$1 order by bill_items.amount desc", [billId])
    ).toEqual([{ item_name: "ค่าส่วนกลาง", amount: "200" }, { item_name: "ค่าปรับ", amount: "50" }]);
  });

  it("บิลแรกใช้มิเตอร์เริ่มต้นของผู้เช่า (initial_electricity_meter) เป็นมิเตอร์ก่อนหน้า (ตาม roomPages.ts)", async () => {
    // Mirror of fetchRoomBillingContext: latest bill meter, else tenant.initial_electricity_meter.
    const previous = await one<{ prev: string }>(
      db,
      `select coalesce(
         (select current_meter from bills where room_id=$1 and current_meter is not null order by billing_year desc, billing_month desc limit 1),
         (select initial_electricity_meter from tenants where id=$2)
       )::text prev`,
      [roomId, tenantId]
    );
    expect(previous.prev).toBe("100");
    const first = await addBill(db, roomId, tenantId, { year: 2026, month: 1, prev: Number(previous.prev), curr: 130 });
    expect((await getBill(db, first)).electricity_units).toBe("30.00");

    const second = await one<{ prev: string }>(
      db, "select current_meter::text prev from bills where room_id=$1 order by billing_year desc, billing_month desc limit 1", [roomId]
    );
    expect(second.prev).toBe("130.00");
  });

  it("trigger คำนวณใหม่ทั้งหมด: ค่าที่ client ส่งมา (น้ำ/ไฟ/รวม) ที่ผิดจะถูกทับ, total = rent+water+electricity+other", async () => {
    const billId = await addBill(db, roomId, tenantId, {
      year: 2026, month: 3, prev: 100, curr: 110, other: 10, items: [{ item_name: "x", amount: 10 }],
      total: 1, water: 1, electricityAmount: 1,
    });
    const bill = await getBill(db, billId);
    expect(bill).toMatchObject({ water_amount: "300.00", electricity_amount: "70.00", other_amount: "10.00", total_amount: "5380.00" });
    expect(Number(bill.total_amount)).toBe(
      Number(bill.rent_amount) + Number(bill.water_amount) + Number(bill.electricity_amount) + Number(bill.other_amount)
    );
  });

  it("trigger คำนวณใหม่ตอน UPDATE ด้วย (เช่น เปลี่ยนมิเตอร์/จำนวนคน) และปฏิเสธมิเตอร์ย้อนหลัง", async () => {
    const billId = await addBill(db, roomId, tenantId, { year: 2026, month: 3, prev: 100, curr: 110 });
    await db.query("update bills set occupant_count=3, current_meter=150, total_amount=0 where id=$1", [billId]);
    expect(await getBill(db, billId)).toMatchObject({ water_amount: "450.00", electricity_units: "50.00", electricity_amount: "350.00", total_amount: "5800.00" });
    expect(await errorOf(() => db.query("update bills set current_meter=99 where id=$1", [billId]))).toMatch(/Current meter cannot be less/);
  });

  it("เศษสตางค์: ไฟ 13.37 หน่วย x 7.25 = 96.9325 -> 96.93, น้ำอัตรา 150.005 -> 150.01 ต่อคน", async () => {
    const billId = await addBill(db, roomId, tenantId, { year: 2026, month: 4, prev: 100, curr: 113.37, rate: 7.25, occupants: 1 });
    expect(await getBill(db, billId)).toMatchObject({ electricity_units: "13.37", electricity_amount: "96.93", total_amount: "5246.93" });

    const b2 = await one<{ id: string }>(
      db,
      `insert into bills (room_id, tenant_id, billing_year, billing_month, rent_amount, occupant_count, water_rate_per_person, previous_meter, current_meter, electricity_rate)
       values ($1,$2,2026,5,5000,3,150.005,0,0.01,7) returning id`,
      [roomId, tenantId]
    );
    expect(await getBill(db, b2.id)).toMatchObject({ water_amount: "450.03", electricity_amount: "0.07", total_amount: "5450.10" });
  });

  it("มิเตอร์เท่าเดิม = 0 หน่วย ใช้ได้ (ได้เฉพาะค่าเช่า+น้ำ)", async () => {
    const billId = await addBill(db, roomId, tenantId, { year: 2026, month: 6, prev: 100, curr: 100 });
    expect(await getBill(db, billId)).toMatchObject({ electricity_units: "0.00", electricity_amount: "0.00", total_amount: "5300.00" });
  });

  it("เดือนซ้ำของห้องเดียวกัน -> error ข้อความเฉพาะ และไม่เหลือบิล/รายการค้าง", async () => {
    await addBill(db, roomId, tenantId, { year: 2026, month: 5, prev: 100, curr: 110 });
    expect(
      await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 5, prev: 110, curr: 120, items: [{ item_name: "a", amount: 1 }] }))
    ).toMatch(/A bill for this room and billing period already exists/);
    expect((await rows(db, "select 1 from bills")).length).toBe(1);
    expect((await rows(db, "select 1 from bill_items")).length).toBe(0);
  });

  it("ข้ามปี ธ.ค. -> ม.ค.: บิล 2026-12 และ 2027-01 อยู่ร่วมกันได้ แต่ปีเดียวกันเดือนเดิมซ้ำไม่ได้", async () => {
    await addBill(db, roomId, tenantId, { year: 2026, month: 12, prev: 100, curr: 110 });
    await addBill(db, roomId, tenantId, { year: 2027, month: 1, prev: 110, curr: 125 });
    const periods = await rows<{ p: string }>(db, "select billing_year||'-'||billing_month p from bills order by billing_year, billing_month");
    expect(periods.map((r) => r.p)).toEqual(["2026-12", "2027-1"]);
    expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 12, prev: 125, curr: 130 }))).toMatch(/already exists/);
  });

  it("ห้องอื่นออกบิลเดือนเดียวกันได้", async () => {
    const roomB = await addRoom(db, "B");
    const tenantB = await addTenant(db, roomB, { meter: 0 });
    await addBill(db, roomId, tenantId, { year: 2026, month: 5, prev: 100, curr: 110 });
    await addBill(db, roomB, tenantB, { year: 2026, month: 5, prev: 0, curr: 10 });
    expect(await rows(db, "select 1 from bills")).toHaveLength(2);
  });

  describe("การตรวจข้อมูล", () => {
    it("มิเตอร์ย้อนหลังถูกปฏิเสธ", async () => {
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 7, prev: 100, curr: 99.99 }))).toMatch(/Current meter cannot be less than previous meter/);
    });

    it("มิเตอร์เป็น null ถูกปฏิเสธ", async () => {
      const r = await errorOf(() =>
        db.query("select create_bill_with_items($1,$2,2026,7,5000,2,150,300,null,null,0,7,0,0,5300,null,'[]'::jsonb)", [roomId, tenantId])
      );
      expect(r).toMatch(/Meter values are required/);
    });

    it("เดือนนอก 1-12, จำนวนคนติดลบ, จำนวนเงินติดลบ", async () => {
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 13, prev: 0, curr: 1 }))).toMatch(/Invalid billing month/);
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 0, prev: 0, curr: 1 }))).toMatch(/Invalid billing month/);
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 7, prev: 100, curr: 101, occupants: -1 }))).toMatch(/Occupant count cannot be negative/);
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 7, prev: 100, curr: 101, rent: -1 }))).toMatch(/Amounts cannot be negative/);
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 7, prev: 100, curr: 101, other: -5 }))).toMatch(/Amounts cannot be negative/);
    });

    it("รายการอื่น ๆ ที่ไม่ถูกต้อง (ชื่อว่าง / จำนวนเงิน 0 / ติดลบ / ไม่ใช่ตัวเลข) ทำให้ทั้งบิล rollback", async () => {
      for (const bad of [
        { item_name: "  ", amount: 10 },
        { item_name: "x", amount: 0 },
        { item_name: "x", amount: -5 },
        { item_name: "x", amount: "" },
      ]) {
        const err = await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 7, prev: 100, curr: 101, other: 0, items: [bad as { item_name: string; amount: number }] }));
        expect(err).toMatch(/Invalid bill item/);
      }
      expect(await rows(db, "select 1 from bills")).toHaveLength(0);
    });

    it("trim ชื่อรายการอื่น ๆ", async () => {
      const id = await addBill(db, roomId, tenantId, { year: 2026, month: 7, prev: 100, curr: 101, items: [{ item_name: "  ซ่อมก๊อก  ", amount: 80 }] });
      expect((await one<{ item_name: string }>(db, "select item_name from bill_items where bill_id=$1", [id])).item_name).toBe("ซ่อมก๊อก");
    });

    it("ผู้เช่าไม่ใช่ของห้องนี้ / ผู้เช่าย้ายออกแล้ว ถูกปฏิเสธ", async () => {
      const roomB = await addRoom(db, "B");
      await expect(addBill(db, roomB, tenantId, { year: 2026, month: 7, prev: 100, curr: 101 })).rejects.toThrow(/Active tenant does not belong to this room/);
      await db.query("update tenants set is_active=false where id=$1", [tenantId]);
      await expect(addBill(db, roomId, tenantId, { year: 2026, month: 7, prev: 100, curr: 101 })).rejects.toThrow(/Active tenant does not belong to this room/);
    });

    it("ต้องล็อกอิน (auth.uid() ไม่เป็น null)", async () => {
      const anon = await createDatabase();
      const r = await addRoom(anon, "A");
      const t = await addTenant(anon, r);
      await expect(addBill(anon, r, t, { year: 2026, month: 7, prev: 100, curr: 101 })).rejects.toThrow(/Authentication required/);
    });

    it("bills_billing_month_check และ status check ใช้ได้ระดับตาราง", async () => {
      const id = await addBill(db, roomId, tenantId, { year: 2026, month: 8, prev: 100, curr: 101 });
      expect(await errorOf(() => db.query("update bills set status='weird' where id=$1", [id]))).toMatch(/bills_status_check/);
    });
  });

  describe("ตรวจตัวเลขที่เว็บส่งมา (create_bill_with_items)", () => {
    it("other_amount ต้องเท่ากับผลรวม bill_items ไม่งั้นปฏิเสธและไม่มีบิลค้างในฐานข้อมูล", async () => {
      const err = await errorOf(() =>
        addBill(db, roomId, tenantId, { year: 2026, month: 9, prev: 100, curr: 100, other: 0, items: [{ item_name: "ค่าซ่อม", amount: 500 }] })
      );
      expect(err).toMatch(/Other amount does not match the sum of the bill items/);
      expect(await rows(db, "select 1 from bills")).toHaveLength(0);
      expect(await rows(db, "select 1 from bill_items")).toHaveLength(0);
      // matching amounts are accepted
      expect(await addBill(db, roomId, tenantId, { year: 2026, month: 9, prev: 100, curr: 100, items: [{ item_name: "ค่าซ่อม", amount: 500 }] })).toBeTruthy();
    });

    it("previous_meter ต้องต่อจาก current_meter ของบิลล่าสุดของผู้เช่า (ช่องว่าง/ซ้อนทับถูกปฏิเสธ)", async () => {
      await addBill(db, roomId, tenantId, { year: 2026, month: 1, prev: 100, curr: 200 });
      for (const prev of [150, 250]) {
        expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 2, prev, curr: prev + 60 }))).toMatch(/Previous meter does not continue/);
      }
      expect(await addBill(db, roomId, tenantId, { year: 2026, month: 2, prev: 200, curr: 260 })).toBeTruthy();
    });

    it("บิลแรกต้องเริ่มจากมิเตอร์ตอนเข้าอยู่ของผู้เช่า (initial_electricity_meter)", async () => {
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 1, prev: 50, curr: 120 }))).toMatch(/Previous meter does not continue from the last reading \(expected 100\)/);
      expect(await addBill(db, roomId, tenantId, { year: 2026, month: 1, prev: 100, curr: 120 })).toBeTruthy();
    });

    it("ผู้เช่าคนใหม่เริ่มจากมิเตอร์ของตัวเอง ไม่ใช่บิลสุดท้ายของคนเก่า", async () => {
      await addBill(db, roomId, tenantId, { year: 2026, month: 1, prev: 100, curr: 130 });
      await db.query("select complete_tenant_move_out($1,'2026-01-31')", [tenantId]);
      const next = await addTenant(db, roomId, { moveIn: "2026-02-01", meter: 135 });
      expect(await errorOf(() => addBill(db, roomId, next, { year: 2026, month: 2, prev: 130, curr: 150 }))).toMatch(/expected 135/);
      expect(await addBill(db, roomId, next, { year: 2026, month: 2, prev: 135, curr: 150 })).toBeTruthy();
    });

    it("ไม่มีมิเตอร์ตอนเข้าอยู่: ใช้ค่าล่าสุดของห้อง; ไม่มีข้อมูลเลย: รับค่าที่ส่งมา", async () => {
      await db.query("select complete_tenant_move_out($1,'2026-01-01')", [tenantId]);
      const bare = await addTenant(db, roomId, { moveIn: "2026-01-01", meter: null });
      expect(await addBill(db, roomId, bare, { year: 2026, month: 1, prev: 777, curr: 800 })).toBeTruthy();
      await db.query("select complete_tenant_move_out($1,'2026-01-31')", [bare]);
      const second = await addTenant(db, roomId, { moveIn: "2026-02-01", meter: null });
      expect(await errorOf(() => addBill(db, roomId, second, { year: 2026, month: 2, prev: 700, curr: 710 }))).toMatch(/expected 800/);
      expect(await addBill(db, roomId, second, { year: 2026, month: 2, prev: 800, curr: 810 })).toBeTruthy();
    });

    it("ย้อนออกบิลเดือนที่เก่ากว่าบิลล่าสุด (back-fill) ไม่ถูกบังคับเรื่องมิเตอร์ต่อเนื่อง", async () => {
      await addBill(db, roomId, tenantId, { year: 2026, month: 1, prev: 100, curr: 200 });
      await addBill(db, roomId, tenantId, { year: 2026, month: 3, prev: 200, curr: 250 });
      expect(await addBill(db, roomId, tenantId, { year: 2026, month: 2, prev: 200, curr: 230 })).toBeTruthy();
    });

    it("ปีต้องอยู่ในช่วง 2000-2200 และเดือนที่ออกบิลต้องไม่ก่อนเดือนที่ผู้เช่าเข้าอยู่", async () => {
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 1900, month: 1, prev: 100, curr: 110 }))).toMatch(/Invalid billing year/);
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2300, month: 1, prev: 100, curr: 110 }))).toMatch(/Invalid billing year/);
      // tenant moved in 2026-01-01 (default in these tests)
      expect(await errorOf(() => addBill(db, roomId, tenantId, { year: 2025, month: 12, prev: 100, curr: 110 }))).toMatch(/before the tenant move-in date/);
    });

    it("เดือนเดียวกับวันเข้าพัก (เข้ากลางเดือน) ออกบิลได้", async () => {
      const room2 = await addRoom(db, "B");
      const mid = await addTenant(db, room2, { moveIn: "2026-03-20", meter: 10 });
      expect(await addBill(db, room2, mid, { year: 2026, month: 3, prev: 10, curr: 20 })).toBeTruthy();
    });

    it("รายการค่าใช้จ่ายอื่นเก็บลำดับตามที่พิมพ์ (position 0,1,2)", async () => {
      const id = await addBill(db, roomId, tenantId, {
        year: 2026, month: 1, prev: 100, curr: 100,
        items: [{ item_name: "ค", amount: 30 }, { item_name: "ก", amount: 10 }, { item_name: "ข", amount: 20 }],
      });
      expect(await rows(db, "select item_name, position from bill_items where bill_id=$1 order by position", [id])).toEqual([
        { item_name: "ค", position: 0 }, { item_name: "ก", position: 1 }, { item_name: "ข", position: 2 },
      ]);
    });
  });

  describe("ช่องโหว่ที่ยังไม่ได้แก้", () => {
    // BUG (Low): rent is client-supplied too; a bill with rent that differs from rooms.monthly_rent (and is not
    // the waived month) is accepted. Waiver (tenants.rent_waived_*) is applied only in BillForm.tsx, never in SQL.
    it.fails("BUG: rent_amount ต้องเป็น monthly_rent หรือ 0 เมื่อเป็นเดือนที่ยกเว้น", async () => {
      const err = await errorOf(() => addBill(db, roomId, tenantId, { year: 2026, month: 1, prev: 100, curr: 110, rent: 1 }));
      expect(err).not.toBeNull();
    });

    it("pin: การสร้างบิลไม่เขียน bill_status_logs (ประวัติเริ่มที่การเปลี่ยนสถานะครั้งแรก)", async () => {
      await addBill(db, roomId, tenantId, { year: 2026, month: 1, prev: 100, curr: 110 });
      expect(await rows(db, "select 1 from bill_status_logs")).toHaveLength(0);
    });

    it("pin: เกิน 12 หลัก/ทศนิยมของ items: bill_items.amount ไม่ปัดเศษแต่ other_amount ปัดเป็นสตางค์ (อาจต่างกัน 0.01)", async () => {
      const id = await addBill(db, roomId, tenantId, {
        year: 2026, month: 10, prev: 100, curr: 100, other: 10.005,
        items: [{ item_name: "a", amount: 10.005 }],
      });
      expect((await getBill(db, id)).other_amount).toBe("10.01");
      expect((await one<{ a: string }>(db, "select amount::text a from bill_items where bill_id=$1", [id])).a).toBe("10.005");
    });
  });
});
