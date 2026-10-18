import { describe, expect, it } from "vitest";
import { DEFAULT_BILLING_RATES, parseRate } from "./billingRates";
import { electricityDeduction, suggestedWater } from "./settlement";

describe("parseRate", () => {
  it("accepts positive numbers up to the maximum and rounds to 2 decimals", () => {
    expect(parseRate("7", 1000)).toBe(7);
    expect(parseRate(" 8.256 ", 1000)).toBe(8.26);
    expect(parseRate("1000", 1000)).toBe(1000);
  });
  it("rejects empty, zero, negative, too large and non-numeric values", () => {
    for (const value of ["", "  ", "0", "-1", "1000.01", "abc", "Infinity"]) expect(parseRate(value, 1000)).toBeNull();
  });
});

describe("rates in the settlement helpers", () => {
  it("defaults to the starting rates and follows a changed rate", () => {
    expect(DEFAULT_BILLING_RATES).toEqual({ water: 150, electricity: 7 });
    expect(electricityDeduction(100, "110")).toBe(70);
    expect(electricityDeduction(100, "110", 8)).toBe(80);
    expect(suggestedWater(2)).toBe(300);
    expect(suggestedWater(2, 200)).toBe(400);
  });
});
