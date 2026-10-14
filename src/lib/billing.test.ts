import { describe, expect, it } from "vitest";
import {
  electricityUnitsUsed,
  hasInvalidOtherItem,
  isValidOtherItem,
} from "./billing";

describe("isValidOtherItem", () => {
  it("accepts a named item with a positive amount", () => {
    expect(isValidOtherItem({ name: "ค่ากุญแจ", amount: "50" })).toBe(true);
  });

  it.each([
    { name: "", amount: "50" },
    { name: "  ", amount: "50" },
    { name: "x", amount: "" },
    { name: "x", amount: "0" },
    { name: "x", amount: "-5" },
    { name: "x", amount: "abc" },
  ])("rejects %o", (item) => {
    expect(isValidOtherItem(item)).toBe(false);
  });
});

describe("hasInvalidOtherItem", () => {
  it("ignores fully empty rows", () => {
    expect(hasInvalidOtherItem([{ name: "", amount: "" }])).toBe(false);
  });

  it("accepts complete rows", () => {
    expect(
      hasInvalidOtherItem([
        { name: "a", amount: "10" },
        { name: "", amount: "" },
      ])
    ).toBe(false);
  });

  it("flags half-filled rows and non-positive amounts", () => {
    expect(hasInvalidOtherItem([{ name: "a", amount: "" }])).toBe(true);
    expect(hasInvalidOtherItem([{ name: "", amount: "10" }])).toBe(true);
    expect(hasInvalidOtherItem([{ name: "a", amount: "0" }])).toBe(true);
  });
});

describe("electricityUnitsUsed", () => {
  it("subtracts previous from current meter", () => {
    expect(electricityUnitsUsed(100, "130.5")).toBe(30.5);
  });

  it("returns 0 for missing or invalid readings", () => {
    expect(electricityUnitsUsed(null, "130")).toBe(0);
    expect(electricityUnitsUsed(100, "")).toBe(0);
    expect(electricityUnitsUsed(100, "abc")).toBe(0);
  });

  it("never goes negative", () => {
    expect(electricityUnitsUsed(100, "90")).toBe(0);
  });
});
