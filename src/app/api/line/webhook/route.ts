import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { replyLineText, verifyLineSignature } from "@/lib/line";

export const runtime = "nodejs";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
};

async function handleEvent(event: LineEvent) {
  if (
    event.type !== "message"
    || event.message?.type !== "text"
    || !event.message.text
    || !event.replyToken
    || !event.source?.userId
  ) return;

  const match = event.message.text.trim().match(/^HOME39\s+([A-F0-9]{16})$/i);
  if (!match) {
    await replyLineText(
      event.replyToken,
      "หากต้องการผูกบัญชี กรุณาส่งรหัส HOME39 ที่ได้รับจากผู้ดูแลหอพัก"
    );
    return;
  }

  const codeHash = createHash("sha256").update(match[1].toUpperCase()).digest("hex");
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("claim_line_link_code", {
    p_code_hash: codeHash,
    p_line_user_id: event.source.userId,
  });

  if (error || !data) {
    await replyLineText(event.replyToken, "รหัสไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอรหัสใหม่จากผู้ดูแล");
    return;
  }

  const result = data as { tenant_name?: string };
  await replyLineText(
    event.replyToken,
    `ผูกบัญชี Home39 สำเร็จแล้ว${result.tenant_name ? `\nผู้เช่า: ${result.tenant_name}` : ""}`
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { events?: LineEvent[] };
  await Promise.all((payload.events || []).map(handleEvent));
  return NextResponse.json({ ok: true });
}
