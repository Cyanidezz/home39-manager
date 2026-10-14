import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { convertHeicToJpeg } from "@/lib/image";
import { matchesDeclaredType } from "@/lib/fileSignature";
import { clientAddressHash } from "@/lib/rateLimit";

export const runtime = "nodejs";

const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const maxFileSize = 8 * 1024 * 1024;
// Same statuses the pay page offers the upload form for.
const uploadableStatuses = ["unpaid", "overdue", "rejected"];

function normalizedType(file: File) {
  const byExtension: Record<string, string> = {
    heic: "image/heic",
    heif: "image/heif",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
  };
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (
    (extension === "heic" || extension === "heif") &&
    (!file.type || file.type === "application/octet-stream")
  ) {
    return byExtension[extension];
  }
  return file.type || byExtension[extension] || "";
}

function extensionFor(file: File, contentType: string) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
  };
  return byType[contentType];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!tokenPattern.test(token)) {
    return NextResponse.json({ error: "ลิงก์บิลไม่ถูกต้อง" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }
  const slip = formData.get("slip");

  if (!(slip instanceof File) || slip.size === 0) {
    return NextResponse.json({ error: "กรุณาเลือกไฟล์สลิป" }, { status: 400 });
  }

  const slipType = normalizedType(slip);

  if (!allowedTypes.has(slipType)) {
    return NextResponse.json(
      { error: "รองรับ JPG, PNG, WebP, HEIC, HEIF หรือ PDF" },
      { status: 415 }
    );
  }

  if (slip.size > maxFileSize) {
    return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 8 MB" }, { status: 413 });
  }

  const supabase = createAdminClient();
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, status, slip_path, slip_preview_path")
    .eq("public_token", token)
    .single();

  if (billError || !bill) {
    return NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 });
  }

  if (bill.status === "paid") {
    return NextResponse.json({ error: "บิลนี้ชำระแล้ว" }, { status: 409 });
  }

  if (!uploadableStatuses.includes(bill.status)) {
    return NextResponse.json(
      { error: "บิลนี้ยังไม่สามารถส่งสลิปได้ หรือสลิปกำลังอยู่ระหว่างตรวจสอบ" },
      { status: 409 }
    );
  }

  // Fail open: if the limiter is unavailable (e.g. migration not applied yet),
  // tenants must still be able to pay.
  const { data: allowed, error: rateError } = await supabase.rpc("check_slip_upload_rate", {
    p_bill_id: bill.id,
    p_ip_hash: clientAddressHash(request.headers),
  });
  if (rateError) {
    console.error("Slip upload rate check failed:", rateError);
  } else if (allowed === false) {
    return NextResponse.json(
      { error: "ส่งสลิปบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const body = new Uint8Array(await slip.arrayBuffer());
  if (!matchesDeclaredType(body, slipType)) {
    return NextResponse.json(
      { error: "เนื้อหาไฟล์ไม่ตรงกับชนิดไฟล์ กรุณาเลือกไฟล์สลิปใหม่" },
      { status: 415 }
    );
  }

  const uploadId = crypto.randomUUID();
  const objectPath = `${bill.id}/${uploadId}.${extensionFor(slip, slipType)}`;
  const isHeic = slipType === "image/heic" || slipType === "image/heif";
  const previewPath = isHeic ? `${bill.id}/${uploadId}.preview.jpg` : null;
  let previewBody: Uint8Array | null = null;

  if (isHeic) {
    try {
      previewBody = await convertHeicToJpeg(body);
    } catch (conversionError) {
      console.error("Payment slip preview conversion failed:", conversionError);
      return NextResponse.json(
        { error: "แปลงไฟล์ HEIC เพื่อแสดงตัวอย่างไม่สำเร็จ กรุณาเลือกไฟล์ใหม่" },
        { status: 415 }
      );
    }
  }

  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(objectPath, body, { contentType: slipType, upsert: false });

  if (uploadError) {
    console.error("Payment slip upload failed:", uploadError);
    return NextResponse.json({ error: "อัปโหลดสลิปไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
  }

  if (previewPath && previewBody) {
    const { error: previewUploadError } = await supabase.storage
      .from("payment-slips")
      .upload(previewPath, previewBody, { contentType: "image/jpeg", upsert: false });

    if (previewUploadError) {
      await supabase.storage.from("payment-slips").remove([objectPath]);
      console.error("Payment slip preview upload failed:", previewUploadError);
      return NextResponse.json({ error: "สร้างตัวอย่างสลิปไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
    }
  }

  const submittedAt = new Date().toISOString();
  // The status filter keeps a concurrent change (e.g. admin confirming payment) from being overwritten.
  const { data: updatedRows, error: updateError } = await supabase
    .from("bills")
    .update({
      slip_path: objectPath,
      slip_preview_path: previewPath,
      slip_original_name: slip.name.slice(0, 255),
      slip_content_type: slipType,
      slip_size_bytes: slip.size,
      slip_submitted_at: submittedAt,
      status: "slip_submitted",
      updated_at: submittedAt,
    })
    .eq("id", bill.id)
    .eq("status", bill.status)
    .select("id");

  if (!updateError && (updatedRows?.length ?? 0) === 0) {
    await supabase.storage.from("payment-slips").remove(
      previewPath ? [objectPath, previewPath] : [objectPath]
    );
    return NextResponse.json(
      { error: "สถานะบิลเพิ่งเปลี่ยน กรุณารีเฟรชหน้านี้แล้วลองอีกครั้ง" },
      { status: 409 }
    );
  }

  if (updateError) {
    await supabase.storage.from("payment-slips").remove(
      previewPath ? [objectPath, previewPath] : [objectPath]
    );
    console.error("Payment slip record update failed:", updateError);
    return NextResponse.json({ error: "บันทึกสลิปไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
  }

  await supabase.from("bill_status_logs").insert({
    bill_id: bill.id,
    old_status: bill.status,
    new_status: "slip_submitted",
    reason: "ผู้เช่าอัปโหลดหลักฐานการชำระเงิน",
  });

  const oldPaths = [bill.slip_path, bill.slip_preview_path].filter(
    (path): path is string => Boolean(path) && path !== objectPath && path !== previewPath
  );
  if (oldPaths.length > 0) {
    await supabase.storage.from("payment-slips").remove(oldPaths);
  }

  return NextResponse.json({ ok: true });
}
