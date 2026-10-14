import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { addOneMonth } from "@/lib/format";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown) {
  if (typeof value !== "string" || !datePattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
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
  if (!tenant.room_id) {
    return NextResponse.json({ error: "ผู้เช่ายังไม่ได้ผูกกับห้อง" }, { status: 400 });
  }

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
  const noticeDateString = noticeDate.toISOString().slice(0, 10);
  const moveOutDateString = moveOutDate.toISOString().slice(0, 10);
  if (moveOutDateString < addOneMonth(noticeDateString)) {
    return NextResponse.json({ error: "วันที่ย้ายออกต้องห่างจากวันที่แจ้งอย่างน้อย 1 เดือน" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("set_tenant_move_out_notice", {
    p_tenant_id: tenantId,
    p_notice_date: noticeDateString,
    p_move_out_date: moveOutDateString,
  });

  if (error) {
    console.error("Save move-out notice failed:", error);
    return NextResponse.json({ error: "บันทึกการแจ้งย้ายออกไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json(data);
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
