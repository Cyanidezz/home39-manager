import { createHash } from "node:crypto";

/** First address in X-Forwarded-For (set by the hosting proxy), or X-Real-IP; "unknown" if absent. */
export function clientAddress(headers: Pick<Headers, "get">) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** Stable hash so rate-limit rows never store the raw address. */
export function clientAddressHash(headers: Pick<Headers, "get">) {
  return createHash("sha256").update(clientAddress(headers)).digest("hex");
}
