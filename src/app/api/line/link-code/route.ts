import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }

  let body: { tenantId?: string };
  try {
    body = (await request.json()) as { tenantId?: string };
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  if (!body.tenantId) {
    return NextResponse.json({ error: "ข้อมูลผู้เช่าไม่ครบ" }, { status: 400 });
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("id", body.tenantId)
    .single();

  if (!tenant) {
    return NextResponse.json({ error: "ไม่พบผู้เช่า" }, { status: 404 });
  }

  const code = randomBytes(8).toString("hex").toUpperCase();
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabase
    .from("line_link_codes")
    .delete()
    .eq("tenant_id", tenant.id)
    .is("used_at", null);

  const { error } = await supabase.from("line_link_codes").insert({
    tenant_id: tenant.id,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: "สร้างรหัสไม่สำเร็จ" }, { status: 500 });
  }

  return NextResponse.json({ code: `HOME39 ${code}`, expiresAt });
}
