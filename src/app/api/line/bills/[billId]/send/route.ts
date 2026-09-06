import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicAppUrl, pushLineText } from "@/lib/line";

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  const { billId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { data: bill } = await supabase
    .from("bills")
    .select("billing_month, billing_year, total_amount, due_date, public_token, rooms(room_code), tenants(full_name, line_user_id)")
    .eq("id", billId)
    .single();

  if (!bill) {
    return NextResponse.json({ error: "ไม่พบบิล" }, { status: 404 });
  }

  const tenant = Array.isArray(bill.tenants) ? bill.tenants[0] : bill.tenants;
  const room = Array.isArray(bill.rooms) ? bill.rooms[0] : bill.rooms;

  if (!tenant?.line_user_id) {
    return NextResponse.json({ error: "ผู้เช่ายังไม่ได้ผูก LINE" }, { status: 409 });
  }

  const amount = Number(bill.total_amount).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const dueDate = bill.due_date
    ? new Date(`${bill.due_date}T00:00:00+07:00`).toLocaleDateString("th-TH", { dateStyle: "long" })
    : "ไม่ระบุ";
  const text = [
    "Home39 · ใบแจ้งค่าใช้จ่าย",
    `ห้อง ${room?.room_code || "-"}`,
    `${thaiMonths[bill.billing_month - 1]} ${bill.billing_year + 543}`,
    `ยอดชำระ ${amount} บาท`,
    `กำหนดชำระ ${dueDate}`,
    "",
    `ดูรายละเอียดและส่งสลิป: ${publicAppUrl()}/pay/${bill.public_token}`,
  ].join("\n");

  try {
    await pushLineText(tenant.line_user_id, text);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("LINE bill push failed:", error);
    return NextResponse.json({ error: "ส่ง LINE ไม่สำเร็จ" }, { status: 502 });
  }
}
