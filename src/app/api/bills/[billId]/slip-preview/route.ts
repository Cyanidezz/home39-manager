import { NextResponse } from "next/server";
import { convertHeicToJpeg } from "@/lib/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxFileSize = 8 * 1024 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  const { billId } = await params;
  if (!uuidPattern.test(billId)) {
    return NextResponse.json({ error: "ไม่พบบิลนี้" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  const { data: bill } = await supabase
    .from("bills")
    .select("slip_path, slip_content_type, slip_size_bytes")
    .eq("id", billId)
    .single();

  if (
    !bill?.slip_path ||
    !["image/heic", "image/heif"].includes(bill.slip_content_type || "")
  ) {
    return NextResponse.json({ error: "ไม่พบสลิป HEIC" }, { status: 404 });
  }

  if (Number(bill.slip_size_bytes) > maxFileSize) {
    return NextResponse.json({ error: "ไฟล์สลิปมีขนาดใหญ่เกินไป" }, { status: 413 });
  }

  const admin = createAdminClient();
  const { data: original, error: downloadError } = await admin.storage
    .from("payment-slips")
    .download(bill.slip_path);

  if (downloadError || !original || original.size > maxFileSize) {
    return NextResponse.json({ error: "โหลดไฟล์สลิปไม่สำเร็จ" }, { status: 404 });
  }

  try {
    const jpeg = await convertHeicToJpeg(new Uint8Array(await original.arrayBuffer()));
    return new Response(Buffer.from(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (conversionError) {
    console.error("Legacy payment slip preview conversion failed:", conversionError);
    return NextResponse.json({ error: "แปลงสลิปไม่สำเร็จ" }, { status: 415 });
  }
}