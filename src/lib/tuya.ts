import { createHash, createHmac } from "node:crypto";

/** Tuya reports the running energy total in thousandths of a kWh (add_ele). */
export const TUYA_ENERGY_SCALE = 0.001;

type TuyaConfig = { accessId: string; accessKey: string; endpoint: string };

type TuyaResponse<T> = { success: boolean; result?: T; msg?: string; code?: number };

export type MeterReading = {
  online: boolean;
  /** Running total of the meter in kWh, or null when the device has not reported one. */
  totalKwh: number | null;
  /** When the device last reported the total. */
  reportedAt: Date | null;
};

export function tuyaConfig(env: Record<string, string | undefined> = process.env): TuyaConfig | null {
  const accessId = env.TUYA_ACCESS_ID?.trim();
  const accessKey = env.TUYA_ACCESS_SECRET?.trim();
  const endpoint = env.TUYA_ENDPOINT?.trim().replace(/\/+$/, "");
  return accessId && accessKey && endpoint ? { accessId, accessKey, endpoint } : null;
}

/** The meter's device id for a room, from TUYA_DEVICE_ID_<ROOM CODE> (rooms without one are not connected). */
export function tuyaDeviceId(roomCode: string, env: Record<string, string | undefined> = process.env) {
  const key = `TUYA_DEVICE_ID_${roomCode.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  return env[key]?.trim() || null;
}

/** Tuya signs the query string in alphabetical order. */
function canonicalPath(path: string) {
  const [pathname, query] = path.split("?");
  return query ? `${pathname}?${query.split("&").sort().join("&")}` : pathname;
}

export function tuyaSignature(
  config: Pick<TuyaConfig, "accessId" | "accessKey">,
  input: { method: string; path: string; timestamp: string; token?: string; body?: string }
) {
  const stringToSign = [
    input.method.toUpperCase(),
    createHash("sha256").update(input.body ?? "").digest("hex"),
    "",
    canonicalPath(input.path),
  ].join("\n");
  return createHmac("sha256", config.accessKey)
    .update(config.accessId + (input.token ?? "") + input.timestamp + stringToSign)
    .digest("hex")
    .toUpperCase();
}

async function tuyaGet<T>(config: TuyaConfig, path: string, token?: string): Promise<T> {
  const timestamp = Date.now().toString();
  const signedPath = canonicalPath(path);
  const response = await fetch(config.endpoint + signedPath, {
    headers: {
      client_id: config.accessId,
      sign: tuyaSignature(config, { method: "GET", path: signedPath, timestamp, token }),
      t: timestamp,
      sign_method: "HMAC-SHA256",
      ...(token ? { access_token: token } : {}),
    },
    cache: "no-store",
  });
  const body = (await response.json()) as TuyaResponse<T>;
  if (!body.success || body.result === undefined) {
    throw new Error(`Tuya request ${path.split("?")[0]} failed: ${body.msg ?? response.status} (${body.code ?? "?"})`);
  }
  return body.result;
}

type ShadowProperty = { code: string; value: unknown; time: number };

export function energyFromShadow(properties: ShadowProperty[]): { totalKwh: number | null; reportedAt: Date | null } {
  const property = properties.find((item) => item.code === "add_ele") ?? properties.find((item) => item.code === "energy");
  const raw = Number(property?.value);
  if (!property || !Number.isFinite(raw) || raw < 0) return { totalKwh: null, reportedAt: null };
  return { totalKwh: Math.round(raw * TUYA_ENERGY_SCALE * 1000) / 1000, reportedAt: new Date(property.time) };
}

/** Current state of one meter: whether it is online and its running energy total. */
export async function readMeter(config: TuyaConfig, deviceId: string): Promise<MeterReading> {
  const { access_token: token } = await tuyaGet<{ access_token: string }>(config, "/v1.0/token?grant_type=1");
  const device = await tuyaGet<{ online: boolean }>(config, `/v1.0/devices/${encodeURIComponent(deviceId)}`, token);
  if (!device.online) return { online: false, totalKwh: null, reportedAt: null };
  const shadow = await tuyaGet<{ properties: ShadowProperty[] }>(
    config,
    `/v2.0/cloud/thing/${encodeURIComponent(deviceId)}/shadow/properties`,
    token
  );
  return { online: true, ...energyFromShadow(shadow.properties ?? []) };
}
