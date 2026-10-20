import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const MAX_KWH = 100_000;

type Params = { params: Promise<{ roomId: string }> };

async function guard(request: Request, { params }: Params) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return { response: NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 }) };
  }
  const { roomId } = await params;
  if (!uuidPattern.test(roomId)) {
    return { response: NextResponse.json({ error: "รหัสห้องไม่ถูกต้อง" }, { status: 400 }) };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 }) };
  return { roomId };
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Enter (or correct) one day's usage by hand. */
export async function PUT(request: Request, context: Params) {
  const checked = await guard(request, context);
  if ("response" in checked) return checked.response;

  const body = await readBody(request);
  const date = typeof body?.date === "string" && datePattern.test(body.date) ? body.date : null;
  const kwh = typeof body?.kwh === "number" ? body.kwh : typeof body?.kwh === "string" && body.kwh.trim() !== "" ? Number(body.kwh) : NaN;
  if (!date || !Number.isFinite(kwh) || kwh < 0 || kwh > MAX_KWH) {
    return NextResponse.json({ error: "กรุณากรอกวันที่และจำนวนหน่วยไฟ (kWh) ให้ถูกต้อง" }, { status: 400 });
  }
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 200) : "";

  const { error } = await createAdminClient().rpc("save_manual_meter_usage", {
    p_room_id: checked.roomId,
    p_usage_date: date,
    p_kwh: Math.round(kwh * 1000) / 1000,
    p_note: note,
  });
  if (error) {
    const future = error.message.includes("future");
    if (!future) console.error("Save manual meter usage failed:", error);
    return NextResponse.json({ error: future ? "ใส่วันที่ในอนาคตไม่ได้" : "บันทึกไม่สำเร็จ" }, { status: future ? 409 : 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Remove one day. */
export async function DELETE(request: Request, context: Params) {
  const checked = await guard(request, context);
  if ("response" in checked) return checked.response;

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!datePattern.test(date)) return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });

  const { error } = await createAdminClient().rpc("delete_meter_usage", { p_room_id: checked.roomId, p_usage_date: date });
  if (error) {
    console.error("Delete meter usage failed:", error);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Use the smart meter's figure for a day that was typed in by hand. */
export async function PATCH(request: Request, context: Params) {
  const checked = await guard(request, context);
  if ("response" in checked) return checked.response;

  const body = await readBody(request);
  const date = typeof body?.date === "string" && datePattern.test(body.date) ? body.date : null;
  if (!date) return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });

  const { error } = await createAdminClient().rpc("use_tuya_meter_usage", { p_room_id: checked.roomId, p_usage_date: date });
  if (error) {
    const known = error.message.includes("totals missing") || error.message.includes("went down");
    if (!known) console.error("Use Tuya meter usage failed:", error);
    return NextResponse.json(
      { error: known ? "วันนี้ไม่มียอดสะสมจากมิเตอร์พอจะคำนวณ" : "เปลี่ยนไม่สำเร็จ" },
      { status: known ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
