import { describe, expect, it } from "vitest";
import { matchesDeclaredType, sniffSlipKind } from "./fileSignature";

const bytes = (...values: (number | string)[]) =>
  Uint8Array.from(
    values.flatMap((value) =>
      typeof value === "number" ? [value] : [...value].map((char) => char.charCodeAt(0))
    )
  );

const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0);
const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);
const webp = bytes("RIFF", 0, 0, 0, 0, "WEBP");
const pdf = bytes("%PDF-1.7\n", 0, 0, 0);
const heic = bytes(0, 0, 0, 0x18, "ftypheic");
const heif = bytes(0, 0, 0, 0x18, "ftypmif1");

describe("sniffSlipKind", () => {
  it("recognises supported formats", () => {
    expect(sniffSlipKind(jpeg)).toBe("jpeg");
    expect(sniffSlipKind(png)).toBe("png");
    expect(sniffSlipKind(webp)).toBe("webp");
    expect(sniffSlipKind(pdf)).toBe("pdf");
    expect(sniffSlipKind(heic)).toBe("heic");
    expect(sniffSlipKind(heif)).toBe("heic");
  });

  it("rejects html, svg, mp4 and short input", () => {
    expect(sniffSlipKind(bytes("<html><body>hello</body>"))).toBeNull();
    expect(sniffSlipKind(bytes("<svg xmlns='x'></svg>"))).toBeNull();
    expect(sniffSlipKind(bytes(0, 0, 0, 0x18, "ftypmp42"))).toBeNull();
    expect(sniffSlipKind(bytes(0xff, 0xd8))).toBeNull();
  });
});

describe("matchesDeclaredType", () => {
  it("accepts when bytes match the declared type", () => {
    expect(matchesDeclaredType(jpeg, "image/jpeg")).toBe(true);
    expect(matchesDeclaredType(heic, "image/heif")).toBe(true);
    expect(matchesDeclaredType(pdf, "application/pdf")).toBe(true);
  });

  it("rejects spoofed or unknown types", () => {
    expect(matchesDeclaredType(pdf, "image/png")).toBe(false);
    expect(matchesDeclaredType(bytes("<html>aaaaaaaa"), "image/jpeg")).toBe(false);
    expect(matchesDeclaredType(jpeg, "text/html")).toBe(false);
  });
});
