import { beforeEach, describe, expect, it } from "vitest";
import { addRoom, addTenant, createDatabase, errorOf, getRoom, getTenant, one, rows, type Db } from "./helpers";

let db: Db;
let roomId: string;

beforeEach(async () => {
  db = await createDatabase();
  roomId = await addRoom(db, "A");
});

describe("1. เริ่มสัญญาเช่า (create_tenant_with_room)", () => {
  it("สร้างผู้เช่าพร้อมไฟล์สัญญา: ห้องเป็น occupied, ค่าเช่า/จำนวนคนถูกอัปเดต, มีแถว contracts", async () => {
    const tenantId = await addTenant(db, roomId, {
      rent: 5500, advance: 5500, deposit: 11000, meter: 1234.5, occupants: 3,
      contractPath: "t/contract.pdf", contractName: "สัญญา.pdf",
    });

    expect(await getRoom(db, roomId)).toEqual({ status: "occupied", occupant_count: 3, monthly_rent: "5500.00" });

    const tenant = await one<Record<string, string | boolean | null>>(
      db,
      "select full_name, phone, is_active, advance_rent_amount::text adv, deposit_amount::text dep, initial_electricity_meter::text meter, move_in_date::text move_in from tenants where id=$1",
      [tenantId]
    );
    expect(tenant).toMatchObject({
      full_name: "สมชาย ใจดี", phone: "0812345678", is_active: true,
      adv: "5500", dep: "11000", meter: "1234.5", move_in: "2026-01-01",
    });

    const contracts = await rows<Record<string, string | null>>(
      db,
      "select room_id, contract_start::text cs, contract_end::text ce, deposit_amount::text dep, file_path, original_file_name from contracts where tenant_id=$1",
      [tenantId]
    );
    expect(contracts).toEqual([
      { room_id: roomId, cs: "2026-01-01", ce: null, dep: "11000.00", file_path: "t/contract.pdf", original_file_name: "สัญญา.pdf" },
    ]);
  });

  it("สร้างผู้เช่าโดยไม่มีไฟล์สัญญา: ไม่มีแถว contracts", async () => {
    const tenantId = await addTenant(db, roomId);
    expect(await rows(db, "select 1 from contracts where tenant_id=$1", [tenantId])).toHaveLength(0);
    expect((await getRoom(db, roomId)).status).toBe("occupied");
  });

  it("มีแค่ path หรือแค่ชื่อไฟล์ -> ข้ามการสร้างสัญญาแบบเงียบ ๆ (pin พฤติกรรมปัจจุบัน)", async () => {
    const t1 = await addTenant(db, roomId, { contractPath: "x.pdf", contractName: null });
    expect(await rows(db, "select 1 from contracts where tenant_id=$1", [t1])).toHaveLength(0);
  });

  it("trim ชื่อ, เบอร์/โน้ตว่างกลายเป็น null, มิเตอร์เริ่มต้นเป็น null ได้, เงินล่วงหน้า/มัดจำเป็น 0 ได้", async () => {
    const id = await addTenant(db, roomId, { name: "  สมหญิง  ", phone: "   ", note: "  ", meter: null, advance: 0, deposit: 0 });
    expect(
      await one(db, "select full_name, phone, note, initial_electricity_meter, advance_rent_amount::text adv, deposit_amount::text dep from tenants where id=$1", [id])
    ).toEqual({ full_name: "สมหญิง", phone: null, note: null, initial_electricity_meter: null, adv: "0", dep: "0" });
  });

  it("ห้องที่ vacant/maintenance ถูกเปลี่ยนเป็น occupied", async () => {
    const m = await addRoom(db, "B", { status: "maintenance" });
    await addTenant(db, m);
    expect((await getRoom(db, m)).status).toBe("occupied");
  });

  describe("การตรวจข้อมูล", () => {
    const bad: [string, Parameters<typeof addTenant>[2], RegExp][] = [
      ["ชื่อว่าง", { name: "   " }, /tenant name is required/],
      ["ค่าเช่า 0", { rent: 0 }, /monthly rent must be greater than zero/],
      ["ค่าเช่าติดลบ", { rent: -1 }, /monthly rent must be greater than zero/],
      ["เงินค่าเช่าล่วงหน้าติดลบ", { advance: -1 }, /advance rent is required/],
      ["มัดจำติดลบ", { deposit: -0.01 }, /deposit is required/],
      ["มิเตอร์เริ่มต้นติดลบ", { meter: -1 }, /initial meter cannot be negative/],
      ["จำนวนคน 0", { occupants: 0 }, /occupant count must be at least one/],
    ];
    for (const [name, args, message] of bad) {
      it(`ปฏิเสธ: ${name}`, async () => {
        expect(await errorOf(() => addTenant(db, roomId, args))).toMatch(message);
        expect(await rows(db, "select 1 from tenants")).toHaveLength(0);
        expect((await getRoom(db, roomId)).status).toBe("vacant");
      });
    }

    it("ปฏิเสธ: ไม่มีวันเข้าพัก / ไม่มีเงินล่วงหน้า / ไม่มีมัดจำ (null)", async () => {
      const call = (idx: number) => {
        const args: unknown[] = ["00000000-0000-4000-8000-0000000000f1", roomId, "n", null, "2026-01-01", 5000, 0, 0, null, 1, null, null, null];
        args[idx] = null;
        return db.query("select create_tenant_with_room($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", args);
      };
      expect(await errorOf(() => call(4))).toMatch(/move-in date is required/);
      expect(await errorOf(() => call(6))).toMatch(/advance rent is required/);
      expect(await errorOf(() => call(7))).toMatch(/deposit is required/);
    });

    it("ผู้เช่าคนที่สองในห้องที่มีผู้เช่า active อยู่แล้วถูกปฏิเสธ และข้อมูลห้องไม่เปลี่ยน", async () => {
      await addTenant(db, roomId, { rent: 5000, occupants: 2 });
      expect(await errorOf(() => addTenant(db, roomId, { rent: 9999, occupants: 5, name: "คนที่สอง" }))).toMatch(/room already has an active tenant/);
      expect(await getRoom(db, roomId)).toEqual({ status: "occupied", occupant_count: 2, monthly_rent: "5000.00" });
      expect(await rows(db, "select 1 from tenants")).toHaveLength(1);
    });

    it("ห้องที่ไม่มีอยู่จริงถูกปฏิเสธ (FK) และไม่เหลือผู้เช่าค้าง", async () => {
      expect(await errorOf(() => addTenant(db, "00000000-0000-4000-8000-00000000dead"))).not.toBeNull();
      expect(await rows(db, "select 1 from tenants")).toHaveLength(0);
    });

    it("รหัสผู้เช่าซ้ำถูกปฏิเสธ", async () => {
      const id = await addTenant(db, roomId);
      const other = await addRoom(db, "B");
      expect(await errorOf(() => addTenant(db, other, { id }))).toMatch(/duplicate key/);
    });
  });

  it("constraint ระดับตาราง: tenants_financial_amounts_check กันเงินติดลบแม้ insert ตรง ๆ", async () => {
    expect(
      await errorOf(() => db.query("insert into tenants (room_id, full_name, deposit_amount) values ($1,'x',-1)", [roomId]))
    ).toMatch(/tenants_financial_amounts_check/);
  });

  it("constraint ระดับตาราง: rooms.status และ occupant_count", async () => {
    expect(await errorOf(() => db.query("update rooms set status='broken' where id=$1", [roomId]))).toMatch(/rooms_status_check/);
    expect(await errorOf(() => db.query("update rooms set occupant_count=-1 where id=$1", [roomId]))).toMatch(/rooms_occupant_count_check/);
  });

  it("ตารางกันผู้เช่า active สองคนในห้องเดียวกันเอง (unique index tenants_one_active_per_room) แม้ insert ตรง ๆ", async () => {
    await addTenant(db, roomId);
    const err = await errorOf(() =>
      db.query("insert into tenants (room_id, full_name, is_active) values ($1,'คนที่สอง',true)", [roomId])
    );
    expect(err).toMatch(/tenants_one_active_per_room|duplicate key/i);
    // an inactive tenant in the same room (history) is fine
    await db.query("insert into tenants (room_id, full_name, is_active) values ($1,'คนเก่า',false)", [roomId]);
  });

  it("ผู้เช่าที่ย้ายออกแล้วไม่นับเป็น active: ห้องเดิมสร้างผู้เช่าใหม่ได้ (ดูไฟล์ 4 สำหรับ flow เต็ม)", async () => {
    const id = await addTenant(db, roomId);
    await db.query("update tenants set is_active=false where id=$1", [id]);
    await addTenant(db, roomId, { name: "คนใหม่" });
    expect((await getTenant(db, id)).is_active).toBe(false);
  });
});
