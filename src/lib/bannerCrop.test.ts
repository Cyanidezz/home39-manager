import { describe, expect, it } from "vitest";
import {
  clampPercent,
  clampZoom,
  coverOverflow,
  positionAfterDrag,
} from "./bannerCrop";

describe("coverOverflow", () => {
  it("overflows on the axis the cover-fit crops", () => {
    // 1000x500 image in a 300x100 frame: scale 0.3 -> 300x150, only height overflows
    expect(coverOverflow(300, 100, 1000, 500)).toEqual({ x: 0, y: expect.closeTo(50, 5) });
  });

  it("overflows horizontally for a wide image in a tall frame", () => {
    const { x, y } = coverOverflow(200, 400, 1000, 500);
    expect(x).toBeCloseTo(600, 5); // scale 0.8 -> 800x400
    expect(y).toBe(0);
  });
});

describe("positionAfterDrag", () => {
  it("moves the focal point opposite to the drag at 100% zoom", () => {
    // 50px of vertical overflow: 1% = 0.5px, so dragging 10px down = -20%
    expect(positionAfterDrag(50, 10, 100, 50, 100)).toBeCloseTo(30, 5);
    expect(positionAfterDrag(50, -10, 100, 50, 100)).toBeCloseTo(70, 5);
  });

  it("cannot pan an axis with no overflow at 100% zoom", () => {
    expect(positionAfterDrag(50, 40, 300, 0, 100)).toBe(50);
  });

  it("pans even without overflow once zoomed", () => {
    // frame 300px, zoom 2x: 1% = 300*(2-1)/100 = 3px
    expect(positionAfterDrag(50, 30, 300, 0, 200)).toBeCloseTo(40, 5);
  });

  it("combines zoom origin and overflow shift", () => {
    // frame 100, overflow 50, zoom 2: (100*1 + 2*50)/100 = 2px per %
    expect(positionAfterDrag(50, 10, 100, 50, 200)).toBeCloseTo(45, 5);
  });
});

describe("clamps", () => {
  it("keeps focal point within 0-100 as an integer", () => {
    expect(clampPercent(-20)).toBe(0);
    expect(clampPercent(133.4)).toBe(100);
    expect(clampPercent(42.6)).toBe(43);
  });

  it("keeps zoom within 100-200 as an integer", () => {
    expect(clampZoom(50)).toBe(100);
    expect(clampZoom(260)).toBe(200);
    expect(clampZoom(132.4)).toBe(132);
  });
});
