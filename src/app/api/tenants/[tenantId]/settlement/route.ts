import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 100_000_000;

type Params = { params: Promise<{ tenantId: string }> };
type Guard = { tenantId: string } | { response: NextResponse };

/** Same-origin, valid id and signed-in admin: the checks every method needs. */
async function guard(request: Request, { params }: Params): Promise<Guard> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return { response: NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 }) };
  }
  const { tenantId } = await params;
  if (!uuidPattern.test(tenantId)) {
    return { response: NextResponse.json({ error: "รหัสผู้เช่าไม่ถูกต้อง" }, { status: 400 }) };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 }) };
  return { tenantId };
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function amount(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 && number <= MAX_AMOUNT ? Math.round(number * 100) / 100 : null;
}

/** The database functions raise plain English messages; turn the ones a person can act on into Thai. */
function friendlyError(message: string) {
  const known: [string, string][] = [
    ["has not moved out", "ผู้เช่ายังไม่ได้ย้ายออก"],
    ["already closed", "ใบสรุปนี้ปิดแล้ว ต้องเปิดแก้ไขก่อน"],
    ["waiting for its payment slip", "มีบิลที่รอตรวจสลิปอยู่ กรุณาตรวจสลิปให้เสร็จก่อนปิดยอด"],
    ["amounts changed", "ยอดเปลี่ยนไปจากที่บันทึกไว้ (เช่น สถานะบิลเปลี่ยน) กรุณาบันทึกใหม่แล้วตรวจยอดอีกครั้ง"],
    ["Transfer date", "กรุณาใส่วันที่โอนคืน"],
    ["slip or a reference", "กรุณาแนบสลิปการโอนหรือใส่เลขอ้างอิง"],
    ["needs a name", "รายการหักแต่ละแถวต้องมีชื่อและจำนวนเงินมากกว่า 0"],
    ["above zero", "รายการหักแต่ละแถวต้องมีชื่อและจำนวนเงินมากกว่า 0"],
  ];
  return known.find(([needle]) => message.includes(needle))?.[1] ?? null;
}

/** Save or recalculate the settlement. */
export async function PUT(request: Request, context: Params) {
  const checked = await guard(request, context);
  if ("response" in checked) return checked.response;

  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const electricity = amount(body.electricityAmount);
  const water = amount(body.waterAmount);
  const hasMeter = body.finalMeter !== null && body.finalMeter !== undefined && body.finalMeter !== "";
  const meter = hasMeter ? amount(body.finalMeter) : null;
  if (electricity === null || water === null || (hasMeter && meter === null)) {
    return NextResponse.json({ error: "กรุณากรอกตัวเลขค่าไฟ ค่าน้ำ และเลขมิเตอร์ให้ถูกต้อง" }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length > 50) return NextResponse.json({ error: "รายการหักมากเกินไป" }, { status: 400 });
  const items: { name: string; amount: number }[] = [];
  for (const raw of rawItems as Record<string, unknown>[]) {
    const name = typeof raw?.name === "string" ? raw.name.trim().slice(0, 200) : "";
    const itemAmount = amount(raw?.amount);
    if (name === "" || itemAmount === null || itemAmount <= 0) {
      return NextResponse.json({ error: "รายการหักแต่ละแถวต้องมีชื่อและจำนวนเงินมากกว่า 0" }, { status: 400 });
    }
    items.push({ name, amount: itemAmount });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";

  const { data, error } = await createAdminClient().rpc("save_move_out_settlement", {
    p_tenant_id: checked.tenantId,
    p_final_electricity_meter: meter as number,
    p_electricity_amount: electricity,
    p_water_amount: water,
    p_items: items,
    p_note: note,
  });
  if (error) {
    const friendly = friendlyError(error.message);
    if (!friendly) console.error("Save move-out settlement failed:", error);
    return NextResponse.json({ error: friendly ?? "บันทึกใบสรุปไม่สำเร็จ" }, { status: friendly ? 409 : 500 });
  }
  return NextResponse.json(data);
}

/** Close the settlement: the refund has been transferred (or nothing is owed back). */
export async function POST(request: Request, context: Params) {
  const checked = await guard(request, context);
  if ("response" in checked) return checked.response;

  const body = await readBody(request);
  if (!body) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const expectedRefund = typeof body.expectedRefund === "number" && Number.isFinite(body.expectedRefund) ? body.expectedRefund : null;
  if (expectedRefund === null) return NextResponse.json({ error: "ไม่พบยอดคืนที่ต้องยืนยัน" }, { status: 400 });

  const refundedOn = typeof body.refundedOn === "string" && datePattern.test(body.refundedOn) ? body.refundedOn : "";
  const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 200) : "";
  const slipPath = typeof body.slipPath === "string" ? body.slipPath.trim().slice(0, 500) : "";
  // The slip belongs to this tenant's folder; refuse a path that points somewhere else.
  if (slipPath !== "" && !slipPath.startsWith(`${checked.tenantId}/`)) {
    return NextResponse.json({ error: "ไฟล์สลิปไม่ถูกต้อง" }, { status: 400 });
  }

  const { data, error } = await createAdminClient().rpc("close_move_out_settlement", {
    p_tenant_id: checked.tenantId,
    p_expected_refund: expectedRefund,
    p_refunded_on: refundedOn,
    p_reference: reference,
    p_slip_path: slipPath,
  });
  if (error) {
    const friendly = friendlyError(error.message);
    if (!friendly) console.error("Close move-out settlement failed:", error);
    return NextResponse.json({ error: friendly ?? "ปิดยอดไม่สำเร็จ" }, { status: friendly ? 409 : 500 });
  }
  return NextResponse.json(data);
}

/** Reopen a closed settlement for a correction. */
export async function DELETE(request: Request, context: Params) {
  const checked = await guard(request, context);
  if ("response" in checked) return checked.response;

  const { data, error } = await createAdminClient().rpc("reopen_move_out_settlement", { p_tenant_id: checked.tenantId });
  if (error) {
    console.error("Reopen move-out settlement failed:", error);
    return NextResponse.json({ error: "เปิดใบสรุปเพื่อแก้ไขไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json(data);
}
