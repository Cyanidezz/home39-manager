import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown) {
  if (typeof value !== "string" || !datePattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function addOneMonth(date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(day, lastDay)));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }

  const { tenantId } = await params;
  if (!uuidPattern.test(tenantId)) {
    return NextResponse.json({ error: "รหัสผู้เช่าไม่ถูกต้อง" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, room_id")
    .eq("id", tenantId)
    .eq("is_active", true)
    .single();
  if (!tenant) return NextResponse.json({ error: "ไม่พบผู้เช่าปัจจุบัน" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const noticeDate = parseDate(body.noticeDate);
  const moveOutDate = parseDate(body.moveOutDate);
  if (!noticeDate || !moveOutDate) {
    return NextResponse.json({ error: "กรุณากรอกวันที่ให้ถูกต้อง" }, { status: 400 });
  }
  if (moveOutDate < addOneMonth(noticeDate)) {
    return NextResponse.json({ error: "วันที่ย้ายออกต้องห่างจากวันที่แจ้งอย่างน้อย 1 เดือน" }, { status: 400 });
  }

  const noticeDateString = noticeDate.toISOString().slice(0, 10);
  const moveOutDateString = moveOutDate.toISOString().slice(0, 10);
  const rentWaivedYear = noticeDate.getUTCFullYear();
  const rentWaivedMonth = noticeDate.getUTCMonth() + 1;
  const admin = createAdminClient();

  const { error: updateError } = await admin.from("tenants").update({
    termination_notice_date: noticeDateString,
    planned_move_out_date: moveOutDateString,
    rent_waived_year: rentWaivedYear,
    rent_waived_month: rentWaivedMonth,
    updated_at: new Date().toISOString(),
  }).eq("id", tenantId);

  if (updateError) {
    console.error("Save move-out notice failed:", updateError);
    return NextResponse.json({ error: "บันทึกการแจ้งย้ายออกไม่สำเร็จ" }, { status: 500 });
  }

  const { data: existingBills, error: billLookupError } = await admin
    .from("bills")
    .select("id, rent_amount, total_amount")
    .eq("tenant_id", tenantId)
    .eq("room_id", tenant.room_id)
    .eq("billing_year", rentWaivedYear)
    .eq("billing_month", rentWaivedMonth);

  if (billLookupError) {
    console.error("Find waived bill failed:", billLookupError);
    return NextResponse.json({ error: "บันทึกวันย้ายออกแล้ว แต่ปรับบิลเดิมไม่สำเร็จ" }, { status: 500 });
  }

  for (const bill of existingBills || []) {
    const rentAmount = Number(bill.rent_amount || 0);
    if (rentAmount <= 0) continue;
    const { error } = await admin.from("bills").update({
      rent_amount: 0,
      total_amount: Math.max(0, Number(bill.total_amount || 0) - rentAmount),
      updated_at: new Date().toISOString(),
    }).eq("id", bill.id);
    if (error) {
      console.error("Apply advance rent to existing bill failed:", error);
      return NextResponse.json({ error: "บันทึกวันย้ายออกแล้ว แต่ปรับบิลเดิมไม่สำเร็จ" }, { status: 500 });
    }
    await admin.from("line_notification_logs").delete().eq("bill_id", bill.id);
  }

  return NextResponse.json({
    ok: true,
    rentWaivedYear,
    rentWaivedMonth,
    adjustedBills: existingBills?.length || 0,
  });
}


export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }

  const { tenantId } = await params;
  if (!uuidPattern.test(tenantId)) {
    return NextResponse.json({ error: "รหัสผู้เช่าไม่ถูกต้อง" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_tenant_move_out", {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error("Cancel move-out failed:", error);
    return NextResponse.json(
      { error: "ยกเลิกการย้ายออกไม่สำเร็จ" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}


export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }

  const { tenantId } = await params;
  if (!uuidPattern.test(tenantId)) {
    return NextResponse.json({ error: "รหัสผู้เช่าไม่ถูกต้อง" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const moveOutDate = parseDate(body.moveOutDate);
  if (!moveOutDate) {
    return NextResponse.json(
      { error: "กรุณากรอกวันที่ย้ายออกจริงให้ถูกต้อง" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("complete_tenant_move_out", {
    p_tenant_id: tenantId,
    p_move_out_date: moveOutDate.toISOString().slice(0, 10),
  });

  if (error) {
    console.error("Complete tenant move-out failed:", error);
    return NextResponse.json(
      { error: "บันทึกผู้เช่าย้ายออกไม่สำเร็จ" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
