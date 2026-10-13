"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicAppUrl, pushLineText } from "@/lib/line";

async function notifyTenantAboutStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  billId: string,
  newStatus: string
) {
  if (!["paid", "rejected", "verifying"].includes(newStatus)) return;

  const { data: bill } = await supabase
    .from("bills")
    .select("total_amount, public_token, rooms(room_code), tenants(line_user_id)")
    .eq("id", billId)
    .single();

  if (!bill) return;
  const tenant = Array.isArray(bill.tenants) ? bill.tenants[0] : bill.tenants;
  const room = Array.isArray(bill.rooms) ? bill.rooms[0] : bill.rooms;
  if (!tenant?.line_user_id) return;

  const amount = Number(bill.total_amount).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const roomText = room?.room_code || "-";
  const messages: Record<string, string> = {
    paid: `Home39 ยืนยันการชำระเงินแล้ว\nห้อง ${roomText}\nยอด ${amount} บาท\nขอบคุณค่ะ`,
    verifying: `Home39 ได้รับสลิปของห้อง ${roomText} แล้ว\nกำลังตรวจสอบหลักฐานการชำระเงิน`,
    rejected: `Home39 ตรวจสอบสลิปห้อง ${roomText} ไม่ผ่าน\nกรุณาตรวจสอบและส่งสลิปใหม่ที่ ${publicAppUrl()}/pay/${bill.public_token}`,
  };

  await pushLineText(tenant.line_user_id, messages[newStatus]);
}

async function setBillStatus(
  billId: string,
  newStatus: string,
  reason: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("update_bill_status", {
    p_bill_id: billId,
    p_new_status: newStatus,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  try {
    await notifyTenantAboutStatus(supabase, billId, newStatus);
  } catch (notificationError) {
    console.error("LINE status notification failed:", notificationError);
  }
}

export async function markBillAsPaid(formData: FormData) {
  const billId = String(formData.get("billId") || "");
  const roomCode = String(formData.get("roomCode") || "");

  if (!billId || !roomCode) {
    throw new Error("ข้อมูลบิลไม่ครบ");
  }

  await setBillStatus(billId, "paid", "บันทึกชำระเงินโดยผู้ดูแล");
  redirect(`/rooms/${roomCode}/bills/${billId}`);
}

export async function rejectBillSlip(formData: FormData) {
  const billId = String(formData.get("billId") || "");
  const roomCode = String(formData.get("roomCode") || "");

  if (!billId || !roomCode) {
    throw new Error("ข้อมูลบิลไม่ครบ");
  }

  await setBillStatus(
    billId,
    "rejected",
    "ผู้ดูแลตรวจสอบแล้วว่าสลิปไม่ถูกต้อง"
  );
  redirect(`/rooms/${roomCode}/bills/${billId}`);
}

export async function updateBillStatus(formData: FormData) {
  const billId = String(formData.get("billId") || "");
  const roomCode = String(formData.get("roomCode") || "");
  const newStatus = String(formData.get("newStatus") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!billId || !roomCode || !newStatus || !reason) {
    throw new Error("กรุณากรอกข้อมูลให้ครบ");
  }

  const allowedStatuses = [
    "unpaid",
    "paid",
    "overdue",
    "slip_submitted",
    "verifying",
    "rejected",
    "draft",
  ];

  if (!allowedStatuses.includes(newStatus)) {
    throw new Error("สถานะไม่ถูกต้อง");
  }

  await setBillStatus(billId, newStatus, reason);
  redirect(`/rooms/${roomCode}/bills/${billId}`);
}
