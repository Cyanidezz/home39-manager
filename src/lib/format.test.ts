import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentPeriod,
  formatMoney,
  formatNumber,
  formatThaiDate,
  formatThaiDateShort,
  formatThaiMonth,
} from "./format";

describe("format", () => {
  it("formats money with two decimals", () => {
    expect(formatMoney(1234.5)).toBe("1,234.50");
    expect(formatMoney("10")).toBe("10.00");
    expect(formatMoney(null)).toBe("0.00");
    expect(formatMoney(undefined)).toBe("0.00");
  });

  it("formats numbers without padding decimals", () => {
    expect(formatNumber(1200)).toBe("1,200");
    expect(formatNumber("7.5")).toBe("7.5");
    expect(formatNumber(null)).toBe("0");
  });

  it("formats Buddhist-era dates", () => {
    expect(formatThaiDate("2026-09-05")).toBe("5 ก.ย. 2569");
    expect(formatThaiDateShort("2026-09-05")).toBe("05/09/2569");
    expect(formatThaiMonth("2026-09-05")).toBe("ก.ย. 2569");
    expect(formatThaiMonth("2026-01")).toBe("ม.ค. 2569");
  });

  it("returns a dash for empty dates", () => {
    expect(formatThaiDate(null)).toBe("-");
    expect(formatThaiDateShort(undefined)).toBe("-");
    expect(formatThaiMonth("")).toBe("-");
  });

  describe("currentPeriod", () => {
    afterEach(() => vi.useRealTimers());

    it("returns YYYY-MM", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-13T05:00:00Z"));
      expect(currentPeriod()).toBe("2026-10");
    });
  });
});
