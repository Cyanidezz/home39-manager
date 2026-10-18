import { afterEach, describe, expect, it, vi } from "vitest";
import { energyFromShadow, readMeter, tuyaConfig, tuyaDeviceId, tuyaSignature } from "./tuya";

const config = { accessId: "id123", accessKey: "secret", endpoint: "https://openapi.example.com" };

afterEach(() => vi.unstubAllGlobals());

describe("tuyaConfig / tuyaDeviceId", () => {
  it("requires all three settings and trims the endpoint", () => {
    expect(tuyaConfig({ TUYA_ACCESS_ID: "a", TUYA_ACCESS_SECRET: "b" })).toBeNull();
    expect(tuyaConfig({ TUYA_ACCESS_ID: "a", TUYA_ACCESS_SECRET: "b", TUYA_ENDPOINT: "https://x.com/" })).toEqual({
      accessId: "a", accessKey: "b", endpoint: "https://x.com",
    });
  });
  it("finds the device id by room code", () => {
    const env = { TUYA_DEVICE_ID_A: " dev1 ", TUYA_DEVICE_ID_B_2: "dev2" };
    expect(tuyaDeviceId("a", env)).toBe("dev1");
    expect(tuyaDeviceId("B-2", env)).toBe("dev2");
    expect(tuyaDeviceId("C", env)).toBeNull();
  });
});

describe("tuyaSignature", () => {
  const base = { method: "GET", path: "/v1.0/devices/x", timestamp: "1700000000000" };
  it("is deterministic uppercase hex", () => {
    expect(tuyaSignature(config, base)).toMatch(/^[0-9A-F]{64}$/);
    expect(tuyaSignature(config, base)).toBe(tuyaSignature(config, base));
  });
  it("sorts the query string and depends on the token", () => {
    expect(tuyaSignature(config, { ...base, path: "/p?b=2&a=1" })).toBe(tuyaSignature(config, { ...base, path: "/p?a=1&b=2" }));
    expect(tuyaSignature(config, { ...base, token: "t" })).not.toBe(tuyaSignature(config, base));
  });
});

describe("energyFromShadow", () => {
  it("converts add_ele (thousandths of kWh) to kWh", () => {
    const result = energyFromShadow([{ code: "add_ele", value: 395714, time: 1792352808512 }]);
    expect(result.totalKwh).toBe(395.714);
    expect(result.reportedAt?.toISOString()).toBe("2026-10-18T19:46:48.512Z");
  });
  it("falls back to energy and reports null when missing or invalid", () => {
    expect(energyFromShadow([{ code: "energy", value: 1000, time: 0 }]).totalKwh).toBe(1);
    expect(energyFromShadow([{ code: "power", value: 5, time: 0 }]).totalKwh).toBeNull();
    expect(energyFromShadow([{ code: "add_ele", value: "x", time: 0 }]).totalKwh).toBeNull();
  });
});

describe("readMeter", () => {
  function stubFetch(routes: Record<string, unknown>) {
    const fetchMock = vi.fn(async (url: string) => {
      const key = Object.keys(routes).find((route) => url.includes(route));
      return { status: 200, json: async () => (key ? routes[key] : { success: false, msg: "no route", code: 404 }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }
  const token = { success: true, result: { access_token: "tok" } };

  it("returns the total of an online device", async () => {
    stubFetch({
      "/v1.0/token": token,
      "/v1.0/devices/dev1": { success: true, result: { online: true } },
      "/shadow/properties": { success: true, result: { properties: [{ code: "add_ele", value: 2500, time: 1 }] } },
    });
    expect(await readMeter(config, "dev1")).toMatchObject({ online: true, totalKwh: 2.5 });
  });
  it("does not read the total of an offline device", async () => {
    const fetchMock = stubFetch({ "/v1.0/token": token, "/v1.0/devices/dev1": { success: true, result: { online: false } } });
    expect(await readMeter(config, "dev1")).toEqual({ online: false, totalKwh: null, reportedAt: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("throws on an API error without leaking the secret", async () => {
    stubFetch({ "/v1.0/token": { success: false, msg: "clientId is invalid", code: 1004 } });
    const error = await readMeter(config, "dev1").catch((e: Error) => e.message);
    expect(error).toMatch(/clientId is invalid/);
    expect(error).not.toMatch(/secret/);
  });
});
