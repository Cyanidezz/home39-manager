import { describe, expect, it } from "vitest";
import { moveItem } from "./list";

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  it("moves forward and backward", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(moveItem(list, 1, 0)).toEqual(["b", "a", "c", "d"]);
  });

  it("does not change the original list", () => {
    moveItem(list, 0, 3);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  it("ignores no-op and out-of-range moves", () => {
    expect(moveItem(list, 2, 2)).toEqual(list);
    expect(moveItem(list, -1, 2)).toEqual(list);
    expect(moveItem(list, 1, 9)).toEqual(list);
    expect(moveItem([], 0, 1)).toEqual([]);
  });
});
