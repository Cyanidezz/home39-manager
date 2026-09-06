import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BillItemInput = { name?: unknown; amount?: unknown };

function numeric(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }

  const { billId } = await params;
  if (!uuidPattern.test(billId)) {
    return NextResponse.json({ error: "รหัสบิลไม่ถูกต้อง" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { data: visibleBill } = await supabase
    .from("bills")
    .select("id")
    .eq("id", billId)
    .single();
  if (!visibleBill) return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const billingYear = numeric(body.billingYear);
  const billingMonth = numeric(body.billingMonth);
  const rentAmount = numeric(body.rentAmount);
  const occupantCount = numeric(body.occupantCount);
  const waterRate = numeric(body.waterRate);
  const previousMeter = numeric(body.previousMeter);
  const currentMeter = numeric(body.currentMeter);
  const electricityRate = numeric(body.electricityRate);
  const dueDate = typeof body.dueDate === "string" && body.dueDate ? body.dueDate : null;
  const rawItems = Array.isArray(body.items) ? body.items as BillItemInput[] : [];

  if (
    billingYear === null || billingYear < 2000 || billingYear > 2200
    || billingMonth === null || billingMonth < 1 || billingMonth > 12
    || rentAmount === null || rentAmount < 0
    || occupantCount === null || !Number.isInteger(occupantCount) || occupantCount < 0
    || waterRate === null || waterRate < 0
    || previousMeter === null || previousMeter < 0
    || currentMeter === null || currentMeter < previousMeter
    || electricityRate === null || electricityRate < 0
    || (dueDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
  ) {
    return NextResponse.json({ error: "ข้อมูลบิลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" }, { status: 400 });
  }

  const items = rawItems
    .map((item) => ({ name: typeof item.name === "string" ? item.name.trim() : "", amount: numeric(item.amount) }))
    .filter((item) => item.name || (item.amount !== null && item.amount !== 0));

  if (items.some((item) => !item.name || item.amount === null || item.amount <= 0)) {
    return NextResponse.json({ error: "กรุณากรอกชื่อและจำนวนเงินของค่าใช้จ่ายอื่นให้ครบ" }, { status: 400 });
  }

  const waterAmount = occupantCount * waterRate;
  const electricityUnits = currentMeter - previousMeter;
  const electricityAmount = electricityUnits * electricityRate;
  const otherAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalAmount = rentAmount + waterAmount + electricityAmount + otherAmount;
  const admin = createAdminClient();

  const { error: updateError } = await admin.from("bills").update({
    billing_year: billingYear,
    billing_month: billingMonth,
    rent_amount: rentAmount,
    occupant_count: occupantCount,
    water_rate_per_person: waterRate,
    water_amount: waterAmount,
    previous_meter: previousMeter,
    current_meter: currentMeter,
    electricity_units: electricityUnits,
    electricity_rate: electricityRate,
    electricity_amount: electricityAmount,
    other_amount: otherAmount,
    total_amount: totalAmount,
    due_date: dueDate,
    updated_at: new Date().toISOString(),
  }).eq("id", billId);

  if (updateError) {
    const message = updateError.code === "23505"
      ? "ห้องนี้มีบิลของเดือนและปีดังกล่าวอยู่แล้ว"
      : "แก้ไขบิลไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const { error: deleteItemsError } = await admin.from("bill_items").delete().eq("bill_id", billId);
  if (deleteItemsError) {
    console.error("Replace bill items failed:", deleteItemsError);
    return NextResponse.json({ error: "บันทึกรายการค่าใช้จ่ายไม่สำเร็จ" }, { status: 500 });
  }

  if (items.length > 0) {
    const { error: insertItemsError } = await admin.from("bill_items").insert(
      items.map((item) => ({ bill_id: billId, item_name: item.name, amount: item.amount }))
    );
    if (insertItemsError) {
      console.error("Insert bill items failed:", insertItemsError);
      return NextResponse.json({ error: "บันทึกรายการค่าใช้จ่ายไม่สำเร็จ" }, { status: 500 });
    }
  }

  await admin.from("line_notification_logs").delete().eq("bill_id", billId);
  return NextResponse.json({ ok: true, totalAmount });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }

  const { billId } = await params;
  if (!uuidPattern.test(billId)) {
    return NextResponse.json({ error: "รหัสบิลไม่ถูกต้อง" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { data: visibleBill } = await supabase
    .from("bills")
    .select("id, slip_path, rooms(room_code)")
    .eq("id", billId)
    .single();

  if (!visibleBill) {
    return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });
  }

  const admin = createAdminClient();
  const dependentTables = [
    "line_notification_logs",
    "bill_status_logs",
    "bill_items",
  ];

  for (const table of dependentTables) {
    const { error } = await admin.from(table).delete().eq("bill_id", billId);
    if (error) {
      console.error(`Delete ${table} failed:`, error);
      return NextResponse.json({ error: "ลบข้อมูลที่เกี่ยวข้องไม่สำเร็จ" }, { status: 500 });
    }
  }

  const { error: deleteError } = await admin.from("bills").delete().eq("id", billId);
  if (deleteError) {
    console.error("Delete bill failed:", deleteError);
    return NextResponse.json({ error: "ลบบิลไม่สำเร็จ" }, { status: 500 });
  }

  if (visibleBill.slip_path) {
    const { error: storageError } = await admin.storage
      .from("payment-slips")
      .remove([visibleBill.slip_path]);
    if (storageError) {
      console.error("Delete payment slip failed:", storageError);
    }
  }

  const rooms = Array.isArray(visibleBill.rooms) ? visibleBill.rooms[0] : visibleBill.rooms;
  return NextResponse.json({ ok: true, roomCode: rooms?.room_code || "" });
}
