import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicAppUrl, pushLineText } from "@/lib/line";

export const runtime = "nodejs";

function bangkokDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function dateDifference(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = bangkokDate();
  const { data: bills, error } = await supabase
    .from("bills")
    .select("id, status, due_date, total_amount, public_token, rooms(room_code), tenants(line_user_id), line_notification_logs(notification_type)")
    .in("status", ["unpaid", "overdue"])
    .not("due_date", "is", null);

  if (error) {
    console.error("Reminder query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let sent = 0;
  for (const bill of bills || []) {
    if (!bill.due_date) continue;
    const tenant = Array.isArray(bill.tenants) ? bill.tenants[0] : bill.tenants;
    const room = Array.isArray(bill.rooms) ? bill.rooms[0] : bill.rooms;
    if (!tenant?.line_user_id) continue;

    const difference = dateDifference(today, bill.due_date);
    const notificationType = difference === 3 ? "due_3_days" : difference < 0 ? "overdue" : null;
    if (!notificationType) continue;

    const logs = Array.isArray(bill.line_notification_logs) ? bill.line_notification_logs : [];
    if (logs.some((log) => log.notification_type === notificationType)) continue;

    const amount = Number(bill.total_amount).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const heading = notificationType === "overdue"
      ? "Home39 · แจ้งยอดเกินกำหนดชำระ"
      : "Home39 · แจ้งเตือนก่อนครบกำหนด 3 วัน";
    const text = [
      heading,
      `ห้อง ${room?.room_code || "-"}`,
      `ยอดชำระ ${amount} บาท`,
      `กำหนดชำระ ${new Date(`${bill.due_date}T00:00:00+07:00`).toLocaleDateString("th-TH", { dateStyle: "long" })}`,
      "",
      `ดูบิลและส่งสลิป: ${publicAppUrl()}/pay/${bill.public_token}`,
    ].join("\n");

    try {
      await pushLineText(tenant.line_user_id, text);
      await supabase.from("line_notification_logs").insert({
        bill_id: bill.id,
        notification_type: notificationType,
      });
      if (notificationType === "overdue" && bill.status !== "overdue") {
        await supabase.from("bills").update({ status: "overdue" }).eq("id", bill.id);
      }
      sent += 1;
    } catch (notificationError) {
      console.error(`Reminder failed for bill ${bill.id}:`, notificationError);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
