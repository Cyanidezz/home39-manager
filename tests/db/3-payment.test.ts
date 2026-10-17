import { beforeEach, describe, expect, it } from "vitest";
import { addBill, addRoom, addTenant, createDatabase, errorOf, getBill, one, rows, signIn, type Db } from "./helpers";

let db: Db;
let roomId: string;
let tenantId: string;
let billId: string;

const status = async (id = billId) => (await getBill(db, id)).status;
const setStatus = (to: string, reason = "เหตุผล", id = billId) =>
  db.query("select * from update_bill_status($1,$2,$3)", [id, to, reason]);

beforeEach(async () => {
  db = await createDatabase();
  roomId = await addRoom(db, "A");
  tenantId = await addTenant(db, roomId, { name: "สมชาย", occupants: 2, meter: 100 });
  await signIn(db);
  billId = await addBill(db, roomId, tenantId, {
    year: 2026, month: 2, prev: 100, curr: 120, items: [{ item_name: "ค่าส่วนกลาง", amount: 200 }, { item_name: "ค่าปรับ", amount: 50 }],
    dueDate: "2026-02-10",
  });
});

describe("3a. หน้าจ่ายเงิน (get_public_bill)", () => {
  const tokenOf = async () => (await one<{ t: string }>(db, "select public_token::text t from bills where id=$1", [billId])).t;

  it("คืน JSON ตามรูปแบบที่ src/app/pay/[token]/page.tsx ใช้ (ไม่มี payment_settings = null)", async () => {
    const { get_public_bill: bill } = await one<{ get_public_bill: Record<string, unknown> }>(db, "select get_public_bill($1::uuid)", [await tokenOf()]);
    expect(Object.keys(bill).sort()).toEqual(
      [
        "room_code", "tenant_name", "billing_year", "billing_month", "rent_amount", "occupant_count", "water_rate_per_person",
        "water_amount", "previous_meter", "current_meter", "electricity_units", "electricity_rate", "electricity_amount",
        "other_amount", "total_amount", "due_date", "status", "issued_at", "paid_at", "bill_items", "payment_settings",
      ].sort()
    );
    expect(bill).toMatchObject({
      room_code: "A", tenant_name: "สมชาย", billing_year: 2026, billing_month: 2, rent_amount: 5000, water_amount: 300,
      electricity_units: 20, electricity_amount: 140, other_amount: 250, total_amount: 5690, due_date: "2026-02-10",
      status: "unpaid", paid_at: null, payment_settings: null,
    });
    // BUG (Low): get_public_bill orders items by (created_at, id). Items of one bill are inserted in one
    // transaction (identical created_at), so the tie is broken by the random UUID: the tenant sees the items in an
    // arbitrary order, not the order the owner typed them (and it can differ between bills). Compare as a set here.
    const items = (bill.bill_items as { item_name: string; amount: number }[]).map((i) => [i.item_name, i.amount]);
    expect(items).toHaveLength(2);
    expect(items).toEqual(expect.arrayContaining([["ค่าส่วนกลาง", 200], ["ค่าปรับ", 50]]));
  });

  it("แนบ payment_settings เมื่อมีการตั้งค่าบัญชี และไม่รั่ว updated_at/id", async () => {
    await db.query("insert into payment_settings (bank_name, bank_code, account_name, account_number) values ('กสิกร','004','บ้าน 39','123-4-56789-0')");
    const { get_public_bill: bill } = await one<{ get_public_bill: { payment_settings: Record<string, string> } }>(db, "select get_public_bill($1::uuid)", [await tokenOf()]);
    expect(bill.payment_settings).toEqual({ bank_name: "กสิกร", bank_code: "004", account_name: "บ้าน 39", account_number: "123-4-56789-0" });
  });

  it("token ไม่มีอยู่ -> null; บิลไม่มีรายการอื่น ๆ -> bill_items = []", async () => {
    expect((await one<{ r: unknown }>(db, "select get_public_bill('00000000-0000-4000-8000-0000000000ff') r")).r).toBeNull();
    const b = await addBill(db, roomId, tenantId, { year: 2026, month: 3, prev: 120, curr: 121 });
    const t = (await one<{ t: string }>(db, "select public_token::text t from bills where id=$1", [b])).t;
    const { get_public_bill: bill } = await one<{ get_public_bill: { bill_items: unknown[] } }>(db, "select get_public_bill($1::uuid)", [t]);
    expect(bill.bill_items).toEqual([]);
  });

  it("ไม่ต้องล็อกอินก็เรียกได้ (ไม่เรียก auth.uid) และสถานะ paid พร้อม paid_at ถูกสะท้อน", async () => {
    await setStatus("paid");
    // the function itself needs no session: clear the JWT subject set by beforeEach
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    const { get_public_bill: bill } = await one<{ get_public_bill: { status: string; paid_at: string | null } }>(db, "select get_public_bill($1::uuid)", [await tokenOf()]);
    expect(bill.status).toBe("paid");
    expect(bill.paid_at).not.toBeNull();
  });

  it("pin: บิล draft ก็ถูกเปิดเผยผ่าน token (หน้า pay ไม่กรอง draft)", async () => {
    await setStatus("draft");
    const { get_public_bill: bill } = await one<{ get_public_bill: { status: string } | null }>(db, "select get_public_bill($1::uuid)", [await tokenOf()]);
    expect(bill?.status).toBe("draft");
  });

  it("ผู้เช่าที่ถูกลบความสัมพันธ์: tenant_name = null (left join) แต่ยังคืนบิล", async () => {
    await db.query("update bills set tenant_id=null where id=$1", [billId]);
    const { get_public_bill: bill } = await one<{ get_public_bill: { tenant_name: string | null } }>(db, "select get_public_bill($1::uuid)", [await tokenOf()]);
    expect(bill.tenant_name).toBeNull();
  });
});

describe("3b. ผู้เช่าส่งสลิป (ขั้นตอน DB ของ api/pay/[token]/slip)", () => {
  // The route updates bills directly with a status guard (not through update_bill_status) and inserts a log.
  async function submitSlip(from = "unpaid") {
    const updated = await rows(
      db,
      `update bills set slip_path='b/1.jpg', slip_original_name='slip.jpg', slip_content_type='image/jpeg', slip_size_bytes=1234,
         slip_submitted_at=now(), status='slip_submitted' where id=$1 and status=$2 returning id`,
      [billId, from]
    );
    if (updated.length) {
      await db.query(
        "insert into bill_status_logs (bill_id, old_status, new_status, reason) values ($1,$2,'slip_submitted','ผู้เช่าอัปโหลดหลักฐานการชำระเงิน')",
        [billId, from]
      );
    }
    return updated.length;
  }

  it("unpaid -> slip_submitted: บันทึกสลิปและ log, ยอดเงินไม่เปลี่ยน, paid_at ยังว่าง", async () => {
    expect(await submitSlip()).toBe(1);
    expect(await getBill(db, billId)).toMatchObject({ status: "slip_submitted", total_amount: "5690.00", paid_at: null });
    expect(await rows(db, "select old_status, new_status, reason from bill_status_logs")).toEqual([
      { old_status: "unpaid", new_status: "slip_submitted", reason: "ผู้เช่าอัปโหลดหลักฐานการชำระเงิน" },
    ]);
  });

  it("guard สถานะ: ถ้าแอดมินยืนยัน paid ไปก่อน การส่งสลิปแบบ unpaid จะอัปเดตได้ 0 แถว", async () => {
    await setStatus("paid");
    expect(await submitSlip("unpaid")).toBe(0);
    expect(await status()).toBe("paid");
  });

  it("rejected -> ส่งสลิปใหม่ได้ (rejected -> slip_submitted)", async () => {
    await setStatus("rejected", "สลิปไม่ชัด");
    expect(await submitSlip("rejected")).toBe(1);
    expect(await status()).toBe("slip_submitted");
  });
});

describe("3c. จำกัดความถี่ส่งสลิป (check_slip_upload_rate)", () => {
  const check = async (bill = billId, ip = "ip-1") =>
    (await one<{ ok: boolean }>(db, "select check_slip_upload_rate($1,$2) ok", [bill, ip])).ok;

  it("อนุญาต 5 ครั้งต่อบิลใน 10 นาที ครั้งที่ 6 ได้ false และไม่บันทึกครั้งที่ถูกปฏิเสธ", async () => {
    for (let i = 0; i < 5; i++) expect(await check()).toBe(true);
    expect(await check()).toBe(false);
    expect(await check()).toBe(false);
    expect((await rows(db, "select 1 from slip_upload_attempts")).length).toBe(5);
  });

  it("อีกบิลหนึ่งของ IP เดียวกันยังส่งได้จนครบ 20 ครั้งต่อ IP", async () => {
    const bills = [billId];
    // billId + 3 more = 4 bills x 5 attempts = exactly the 20-per-IP limit
    for (let m = 3; m <= 5; m++) bills.push(await addBill(db, roomId, tenantId, { year: 2026, month: m, prev: 120, curr: 120 }));
    const fifth = await addBill(db, roomId, tenantId, { year: 2026, month: 6, prev: 120, curr: 120 });
    for (const b of bills) for (let i = 0; i < 5; i++) expect(await check(b, "same-ip")).toBe(true); 
    expect(await check(fifth, "same-ip")).toBe(false);
    expect(await check(fifth, "other-ip")).toBe(true);
  });

  it("แถวที่เก่ากว่า 10 นาทีไม่นับ; แถวเก่ากว่า 1 วันถูกลบทิ้ง", async () => {
    for (let i = 0; i < 5; i++) await check();
    expect(await check()).toBe(false);
    await db.query("update slip_upload_attempts set created_at = now() - interval '11 minutes'");
    expect(await check()).toBe(true); // window passed, old rows kept (< 1 day)
    expect((await rows(db, "select 1 from slip_upload_attempts")).length).toBe(6);
    await db.query("update slip_upload_attempts set created_at = now() - interval '25 hours' where id <= 3");
    await check();
    const left = await one<{ n: number }>(db, "select count(*)::int n from slip_upload_attempts where created_at < now() - interval '1 day'");
    expect(left.n).toBe(0);
    expect((await rows(db, "select 1 from slip_upload_attempts")).length).toBe(4);
  });

  it("พารามิเตอร์กำหนดเองใช้ได้ (max_per_bill = 1)", async () => {
    const r1 = await one<{ ok: boolean }>(db, "select check_slip_upload_rate($1,'x','10 minutes',1,20) ok", [billId]);
    const r2 = await one<{ ok: boolean }>(db, "select check_slip_upload_rate($1,'x','10 minutes',1,20) ok", [billId]);
    expect([r1.ok, r2.ok]).toEqual([true, false]);
  });

  it("ลบบิล -> แถว attempts ถูกลบตาม (cascade)", async () => {
    await check();
    await db.query("delete from bills where id=$1", [billId]);
    expect(await rows(db, "select 1 from slip_upload_attempts")).toHaveLength(0);
  });
});

describe("3d. เปลี่ยนสถานะบิล (update_bill_status)", () => {
  it("unpaid -> slip_submitted -> verifying -> paid: ตั้ง paid_at เฉพาะตอน paid และเขียน log ทุกครั้ง", async () => {
    await setStatus("slip_submitted", "  ได้รับสลิป  ");
    expect((await getBill(db, billId)).paid_at).toBeNull();
    await setStatus("verifying", "กำลังตรวจ");
    expect((await getBill(db, billId)).paid_at).toBeNull();
    const returned = await one<{ status: string; paid_at: string | null }>(db, "select status, paid_at::text from update_bill_status($1,'paid','ยืนยัน')", [billId]);
    expect(returned.status).toBe("paid");
    expect(returned.paid_at).not.toBeNull();
    expect(await rows(db, "select old_status, new_status, reason from bill_status_logs order by changed_at, new_status")).toEqual(
      expect.arrayContaining([
        { old_status: "unpaid", new_status: "slip_submitted", reason: "ได้รับสลิป" },
        { old_status: "slip_submitted", new_status: "verifying", reason: "กำลังตรวจ" },
        { old_status: "verifying", new_status: "paid", reason: "ยืนยัน" },
      ])
    );
    expect(await rows(db, "select 1 from bill_status_logs")).toHaveLength(3);
  });

  it("verifying -> rejected: paid_at ยังว่าง; rejected -> slip_submitted ได้", async () => {
    await setStatus("verifying");
    await setStatus("rejected", "สลิปปลอม");
    expect(await getBill(db, billId)).toMatchObject({ status: "rejected", paid_at: null });
    await setStatus("slip_submitted", "ส่งใหม่");
    expect(await status()).toBe("slip_submitted");
  });

  it("paid -> สถานะอื่น: ล้าง paid_at; paid ใหม่ได้เวลาใหม่", async () => {
    await setStatus("paid");
    expect((await getBill(db, billId)).paid_at).not.toBeNull();
    await setStatus("unpaid", "ยกเลิกการรับเงิน");
    expect(await getBill(db, billId)).toMatchObject({ status: "unpaid", paid_at: null });
    await setStatus("paid", "รับเงินอีกครั้ง");
    expect((await getBill(db, billId)).paid_at).not.toBeNull();
  });

  it("unpaid -> overdue -> paid และ draft ใช้ได้", async () => {
    await setStatus("overdue", "เลยกำหนด");
    await setStatus("paid", "จ่ายช้า");
    expect(await status()).toBe("paid");
    await setStatus("draft", "ย้อนเป็นร่าง");
    expect(await getBill(db, billId)).toMatchObject({ status: "draft", paid_at: null });
  });

  it("ปฏิเสธ: สถานะเดิม, สถานะไม่รู้จัก, เหตุผลว่าง/ช่องว่าง/null, บิลไม่มี, ไม่ล็อกอิน", async () => {
    expect(await errorOf(() => setStatus("unpaid"))).toMatch(/New status must differ from current status/);
    expect(await errorOf(() => setStatus("cancelled"))).toMatch(/Invalid bill status: cancelled/);
    expect(await errorOf(() => setStatus("paid", "   "))).toMatch(/Reason is required/);
    expect(await errorOf(() => db.query("select update_bill_status($1,'paid',null)", [billId]))).toMatch(/Reason is required/);
    expect(await errorOf(() => setStatus("paid", "x", "00000000-0000-4000-8000-0000000000ee"))).toMatch(/Bill not found/);
    expect(await rows(db, "select 1 from bill_status_logs")).toHaveLength(0);
    await db.query("select set_config('request.jwt.claim.sub','',false)");
    expect(await errorOf(() => setStatus("paid"))).toMatch(/Authentication required/);
    expect(await status()).toBe("unpaid");
  });

  it("เปลี่ยนสถานะไม่ทำให้ยอดเงินเปลี่ยน (trigger คำนวณซ้ำได้ค่าเท่าเดิม)", async () => {
    await setStatus("paid");
    expect((await getBill(db, billId)).total_amount).toBe("5690.00");
  });

  // BUG (Medium): update_bill_status has no transition rules. A paid bill can jump straight to slip_submitted /
  // verifying / draft, and an unpaid bill can be marked verifying/paid without any slip. Only same-status is blocked.
  it.fails("BUG: ไม่ควรให้ paid -> slip_submitted / verifying (ต้องผ่านการยกเลิกการรับเงินก่อน)", async () => {
    await setStatus("paid");
    expect(await errorOf(() => setStatus("slip_submitted"))).not.toBeNull();
  });

  // BUG (Low): leaving slip_* status (e.g. -> rejected / unpaid) keeps slip_path etc.; harmless in DB, but a
  // second state exists where status=unpaid while slip_submitted_at is set. Pin the current behaviour.
  it("pin: rejected ยังเก็บ slip_path ไว้ (ไม่ถูกล้าง)", async () => {
    await db.query("update bills set slip_path='b/1.jpg', slip_submitted_at=now() where id=$1", [billId]);
    await setStatus("rejected", "ไม่ชัด");
    const row = await one<{ slip_path: string | null }>(db, "select slip_path from bills where id=$1", [billId]);
    expect(row.slip_path).toBe("b/1.jpg");
  });
});
