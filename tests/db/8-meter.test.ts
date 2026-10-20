import { beforeEach, describe, expect, it } from "vitest";
import { addRoom, createDatabase, errorOf, one, rows, type Db } from "./helpers";

let db: Db;
let roomId: string;

const record = (date: string, total: number, room = roomId) =>
  one<{ r: { ok: boolean; kwh?: number | null; skipped?: string } }>(db, "select record_meter_total($1,$2,$3) r", [room, date, total]).then((row) => row.r);
const manual = (date: string, kwh: number, note: string | null = null) =>
  db.query("select save_manual_meter_usage($1,$2,$3,$4)", [roomId, date, kwh, note]);
const day = (date: string) =>
  one<{ kwh: string | null; total: string | null; source: string; note: string | null }>(
    db,
    "select kwh::text kwh, end_total_kwh::text total, source, note from meter_daily_usage where room_id=$1 and usage_date=$2",
    [roomId, date]
  );

beforeEach(async () => {
  db = await createDatabase();
  roomId = await addRoom(db, "A");
});

describe("8a. มิเตอร์ Tuya: เก็บยอดสะสมสิ้นวัน แล้วหาหน่วยที่ใช้จากผลต่าง", () => {
  it("วันแรกยังไม่มียอดของเมื่อวาน จึงไม่มีหน่วยที่ใช้ แต่เก็บยอดสะสมไว้", async () => {
    expect(await record("2026-10-19", 395.714)).toEqual({ ok: true, kwh: null });
    expect(await day("2026-10-19")).toMatchObject({ kwh: null, total: "395.714", source: "tuya" });
  });

  it("วันถัดไปใช้ผลต่างของยอดสะสม", async () => {
    await record("2026-10-19", 395.714);
    expect((await record("2026-10-20", 410.214)).kwh).toBe(14.5);
    expect(await day("2026-10-20")).toMatchObject({ kwh: "14.500", total: "410.214" });
  });

  it("ยอดสะสมต่ำกว่าเมื่อวาน (เปลี่ยน/รีเซ็ตมิเตอร์) ไม่คิดหน่วย", async () => {
    await record("2026-10-19", 395.714);
    expect((await record("2026-10-20", 3.2)).kwh).toBeNull();
  });

  it("ขาดวันกลางคัน ไม่เฉลี่ยให้ วันนั้นไม่มีหน่วย", async () => {
    await record("2026-10-19", 400);
    expect((await record("2026-10-21", 430)).kwh).toBeNull();
  });

  it("รันซ้ำคืนเดิมได้ ไม่เกิดแถวซ้ำ", async () => {
    await record("2026-10-19", 400);
    await record("2026-10-20", 410);
    await record("2026-10-20", 410.5);
    expect((await rows(db, "select 1 from meter_daily_usage where room_id=$1", [roomId])).length).toBe(2);
    expect((await day("2026-10-20"))!.kwh).toBe("10.500");
  });

  it("ไม่แตะหน่วยของวันที่กรอกเอง แต่เก็บยอดสะสมไว้ให้วันถัดไปคำนวณ", async () => {
    await manual("2026-10-19", 12);
    expect(await record("2026-10-19", 400)).toEqual({ ok: true, skipped: "manual" });
    expect(await day("2026-10-19")).toMatchObject({ kwh: "12.000", total: "400.000", source: "manual" });
    expect((await record("2026-10-20", 410)).kwh).toBe(10);
  });

  it("ไม่ทับหน่วยที่มีอยู่แล้วด้วยค่าว่าง เมื่อรันซ้ำแล้วไม่มียอดของเมื่อวาน", async () => {
    await record("2026-10-12", 363.568);
    await record("2026-10-13", 368.766);
    expect((await day("2026-10-13"))!.kwh).toBe("5.198");
    await db.query("delete from meter_daily_usage where room_id=$1 and usage_date=$2", [roomId, "2026-10-12"]);
    expect((await record("2026-10-13", 368.766)).kwh).toBe(5.198);
    expect((await day("2026-10-13"))!.kwh).toBe("5.198");
  });

  it("ปฏิเสธยอดติดลบ", async () => {
    expect(await errorOf(() => record("2026-10-19", -1))).toMatch(/zero or more/);
  });
});

describe("8b. กรอกหน่วยไฟย้อนหลังเอง", () => {
  it("บันทึก แก้ไข และลบได้", async () => {
    await manual("2026-10-03", 7.5, "ตั้งแต่ต้นเดือน");
    expect(await day("2026-10-03")).toMatchObject({ kwh: "7.500", source: "manual", note: "ตั้งแต่ต้นเดือน" });
    await manual("2026-10-03", 8, "  ");
    expect(await day("2026-10-03")).toMatchObject({ kwh: "8.000", note: null });
    await db.query("select delete_meter_usage($1,$2)", [roomId, "2026-10-03"]);
    expect(await day("2026-10-03")).toBeUndefined();
  });

  it("กรอกทับวันที่มิเตอร์เก็บไว้ได้ ยอดสะสมของวันนั้นยังอยู่ วันถัดไปจึงคำนวณได้", async () => {
    await record("2026-10-19", 400);
    await manual("2026-10-19", 9);
    expect(await day("2026-10-19")).toMatchObject({ kwh: "9.000", total: "400.000", source: "manual" });
    expect((await record("2026-10-20", 410)).kwh).toBe(10);
  });

  it("ไม่รับวันที่ในอนาคต ค่าติดลบ หรือห้องที่ไม่มี", async () => {
    expect(await errorOf(() => manual("2999-01-01", 5))).toMatch(/future/);
    expect(await errorOf(() => manual("2026-10-03", -1))).toMatch(/zero or more/);
    expect(await errorOf(() => db.query("select save_manual_meter_usage($1,$2,$3,$4)", ["00000000-0000-4000-8000-00000000ffff", "2026-10-03", 1, null]))).toMatch(/Room not found/);
  });

  it("ข้อมูลหายไปพร้อมห้อง", async () => {
    await manual("2026-10-03", 5);
    await db.query("delete from rooms where id=$1", [roomId]);
    expect((await rows(db, "select 1 from meter_daily_usage")).length).toBe(0);
  });
});
