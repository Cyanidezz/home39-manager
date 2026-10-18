import { describe, expect, it } from "vitest";
import { fitWithin, isResizableImage } from "./imageResize";

describe("fitWithin", () => {
  it("leaves images within the limit alone", () => {
    expect(fitWithin(2000, 1500)).toEqual({ width: 2000, height: 1500, scaled: false });
  });
  it("scales landscape by width and keeps the ratio", () => {
    expect(fitWithin(4800, 3200)).toEqual({ width: 2400, height: 1600, scaled: true });
  });
  it("scales portrait by height", () => {
    expect(fitWithin(3000, 6000)).toEqual({ width: 1200, height: 2400, scaled: true });
  });
  it("never produces a zero side", () => {
    expect(fitWithin(100000, 10)).toEqual({ width: 2400, height: 1, scaled: true });
  });
});

describe("isResizableImage", () => {
  it("only re-encodes still jpeg/png/webp", () => {
    expect(isResizableImage({ type: "image/jpeg" })).toBe(true);
    expect(isResizableImage({ type: "image/webp" })).toBe(true);
    expect(isResizableImage({ type: "image/gif" })).toBe(false);
    expect(isResizableImage({ type: "image/heic" })).toBe(false);
  });
});
