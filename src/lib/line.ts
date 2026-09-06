import { createHmac, timingSafeEqual } from "crypto";

type LineMessage = {
  type: "text";
  text: string;
};

function accessToken() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  return token;
}

export function verifyLineSignature(body: string, signature: string | null) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(body).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length
    && timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function sendLine(path: string, payload: unknown) {
  const response = await fetch(`https://api.line.me${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LINE API ${response.status}: ${detail}`);
  }
}

export async function replyLineText(replyToken: string, text: string) {
  await sendLine("/v2/bot/message/reply", {
    replyToken,
    messages: [{ type: "text", text } satisfies LineMessage],
  });
}

export async function pushLineText(lineUserId: string, text: string) {
  await sendLine("/v2/bot/message/push", {
    to: lineUserId,
    messages: [{ type: "text", text } satisfies LineMessage],
  });
}

export function publicAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercelDeploymentUrl = process.env.VERCEL_URL;
  const url = configuredUrl
    || (vercelProductionUrl ? `https://${vercelProductionUrl}` : "")
    || (vercelDeploymentUrl ? `https://${vercelDeploymentUrl}` : "");

  if (!url) {
    throw new Error("Application URL is not configured");
  }

  return url.replace(/\/$/, "");
}
