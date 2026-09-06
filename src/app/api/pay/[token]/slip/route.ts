import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const maxFileSize = 8 * 1024 * 1024;

function extensionFor(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return byType[file.type];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!tokenPattern.test(token)) {
    return NextResponse.json({ error: "ลิงก์บิลไม่ถูกต้อง" }, { status: 404 });
  }

  const formData = await request.formData();
  const slip = formData.get("slip");

  if (!(slip instanceof File) || slip.size === 0) {
    return NextResponse.json({ error: "กรุณาเลือกไฟล์สลิป" }, { status: 400 });
  }

  if (!allowedTypes.has(slip.type)) {
    return NextResponse.json(
      { error: "รองรับเฉพาะ JPG, PNG, WebP หรือ PDF" },
      { status: 415 }
    );
  }

  if (slip.size > maxFileSize) {
    return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 8 MB" }, { status: 413 });
  }

  const supabase = createAdminClient();
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, status, slip_path")
    .eq("public_token", token)
    .single();

  if (billError || !bill) {
    return NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 });
  }

  if (bill.status === "paid") {
    return NextResponse.json({ error: "บิลนี้ชำระแล้ว" }, { status: 409 });
  }

  const objectPath = `${bill.id}/${crypto.randomUUID()}.${extensionFor(slip)}`;
  const body = new Uint8Array(await slip.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(objectPath, body, { contentType: slip.type, upsert: false });

  if (uploadError) {
    console.error("Payment slip upload failed:", uploadError);
    return NextResponse.json({ error: "อัปโหลดสลิปไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
  }

  const submittedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("bills")
    .update({
      slip_path: objectPath,
      slip_original_name: slip.name.slice(0, 255),
      slip_content_type: slip.type,
      slip_size_bytes: slip.size,
      slip_submitted_at: submittedAt,
      status: "slip_submitted",
      updated_at: submittedAt,
    })
    .eq("id", bill.id);

  if (updateError) {
    await supabase.storage.from("payment-slips").remove([objectPath]);
    console.error("Payment slip record update failed:", updateError);
    return NextResponse.json({ error: "บันทึกสลิปไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
  }

  await supabase.from("bill_status_logs").insert({
    bill_id: bill.id,
    old_status: bill.status,
    new_status: "slip_submitted",
    reason: "ผู้เช่าอัปโหลดหลักฐานการชำระเงิน",
  });

  if (bill.slip_path && bill.slip_path !== objectPath) {
    await supabase.storage.from("payment-slips").remove([bill.slip_path]);
  }

  return NextResponse.json({ ok: true });
}
