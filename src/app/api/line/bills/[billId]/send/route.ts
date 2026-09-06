import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicAppUrl, pushLineFlex } from "@/lib/line";

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
  const billUrl = `${publicAppUrl()}/pay/${bill.public_token}`;
  const period = `${thaiMonths[bill.billing_month - 1]} ${bill.billing_year + 543}`;
  const roomCode = room?.room_code || "-";
  const flexContents = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#111827",
      paddingAll: "20px",
      contents: [
        { type: "text", text: "HOME39", color: "#FFFFFF", size: "xl", weight: "bold" },
        { type: "text", text: "ใบแจ้งค่าใช้จ่าย", color: "#D1D5DB", size: "sm", margin: "sm" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "md",
      contents: [
        { type: "box", layout: "horizontal", contents: [
          { type: "text", text: "ห้อง", color: "#6B7280", size: "sm", flex: 0 },
          { type: "text", text: roomCode, color: "#111827", size: "lg", weight: "bold", align: "end" },
        ] },
        { type: "box", layout: "horizontal", contents: [
          { type: "text", text: "รอบบิล", color: "#6B7280", size: "sm", flex: 0 },
          { type: "text", text: period, color: "#111827", size: "sm", align: "end" },
        ] },
        { type: "separator", margin: "lg", color: "#E5E7EB" },
        { type: "text", text: "ยอดชำระ", color: "#6B7280", size: "sm", margin: "lg" },
        { type: "text", text: `${amount} บาท`, color: "#111827", size: "xxl", weight: "bold" },
        { type: "box", layout: "horizontal", margin: "md", contents: [
          { type: "text", text: "กำหนดชำระ", color: "#6B7280", size: "sm", flex: 0 },
          { type: "text", text: dueDate, color: "#DC2626", size: "sm", weight: "bold", align: "end", wrap: true },
        ] },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      paddingTop: "0px",
      contents: [
        { type: "button", style: "primary", height: "sm", color: "#16A34A",
          action: { type: "uri", label: "ดูบิลและส่งสลิป", uri: billUrl } },
      ],
    },
  };

  try {
    await pushLineFlex(
      tenant.line_user_id,
      `บิล Home39 ห้อง ${roomCode} ยอด ${amount} บาท`,
      flexContents
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("LINE bill push failed:", error);
    const detail = error instanceof Error ? error.message : "";
    let userMessage = "ส่ง LINE ไม่สำเร็จ";

    if (detail.includes("LINE_CHANNEL_ACCESS_TOKEN is not configured")) {
      userMessage = "ยังไม่ได้ตั้งค่า LINE Channel Access Token ใน Vercel";
    } else if (detail.includes("LINE API 401")) {
      userMessage = "LINE Channel Access Token ไม่ถูกต้องหรือหมดอายุ";
    } else if (detail.includes("LINE API 403")) {
      userMessage = "LINE ไม่อนุญาตให้ส่งข้อความ กรุณาตรวจว่าผู้เช่าเพิ่มเพื่อนและไม่ได้บล็อกบัญชี";
    } else if (detail.includes("LINE API 400")) {
      userMessage = "LINE ปฏิเสธข้อมูลผู้รับ กรุณาผูกบัญชี LINE ของผู้เช่าใหม่";
    } else if (error instanceof DOMException && error.name === "TimeoutError") {
      userMessage = "LINE ตอบช้าเกินไป กรุณาลองใหม่";
    }

    return NextResponse.json({ error: userMessage }, { status: 502 });
  }
}
