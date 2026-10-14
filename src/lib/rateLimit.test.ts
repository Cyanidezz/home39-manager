import { describe, expect, it } from "vitest";
import { clientAddress, clientAddressHash } from "./rateLimit";

const headers = (values: Record<string, string>) => new Headers(values);

describe("clientAddress", () => {
  it("uses the first forwarded address", () => {
    expect(clientAddress(headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientAddress(headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientAddress(headers({}))).toBe("unknown");
  });
});

describe("clientAddressHash", () => {
  it("is stable, hex, and does not contain the address", () => {
    const hash = clientAddressHash(headers({ "x-forwarded-for": "1.2.3.4" }));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(clientAddressHash(headers({ "x-forwarded-for": "1.2.3.4" })));
    expect(hash).not.toContain("1.2.3.4");
    expect(hash).not.toBe(clientAddressHash(headers({ "x-forwarded-for": "1.2.3.5" })));
  });
});
