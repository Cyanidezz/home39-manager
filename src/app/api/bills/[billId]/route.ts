import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
