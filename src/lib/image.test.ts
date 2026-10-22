import { describe, expect, it } from "vitest";
import { convertHeicToJpeg, declaredHeicSize } from "./image";

function heicWithSize(width: number, height: number) {
  const bytes = new Uint8Array(64);
  const view = new DataView(bytes.buffer);
  bytes.set([0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], 4); // ftypheic
  view.setUint32(28, 20);
  bytes.set([0x69, 0x73, 0x70, 0x65], 32); // ispe
  view.setUint32(40, width);
  view.setUint32(44, height);
  return bytes;
}

describe("HEIC size guard", () => {
  it("reads the declared size", () => {
    expect(declaredHeicSize(heicWithSize(4032, 3024))).toEqual({ width: 4032, height: 3024 });
  });

  it("refuses a tiny file that declares a huge picture before decoding", async () => {
    await expect(convertHeicToJpeg(heicWithSize(60000, 60000))).rejects.toThrow(/too large/);
    await expect(convertHeicToJpeg(heicWithSize(20000, 100))).rejects.toThrow(/too large/);
  });

  it("refuses a file without a declared size", async () => {
    await expect(convertHeicToJpeg(new Uint8Array(64))).rejects.toThrow(/missing/);
  });
});
