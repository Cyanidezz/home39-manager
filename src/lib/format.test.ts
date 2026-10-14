import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentPeriod,
  formatMoney,
  formatNumber,
  formatThaiDate,
  formatThaiDateShort,
  formatThaiMonth,
  parsePeriod,
  addOneMonth,
  bangkokDate,
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

    it("uses Bangkok time at the month boundary", () => {
      // 17:00 UTC on Sep 30 is 00:00 on Oct 1 in Bangkok (UTC+7)
      expect(currentPeriod(new Date("2026-09-30T17:00:00Z"))).toBe("2026-10");
      expect(currentPeriod(new Date("2026-09-30T16:59:00Z"))).toBe("2026-09");
    });

    it("handles the year boundary", () => {
      expect(currentPeriod(new Date("2026-12-31T18:00:00Z"))).toBe("2027-01");
    });
  });
});

describe("parsePeriod", () => {
  afterEach(() => vi.useRealTimers());

  it("accepts a valid YYYY-MM value", () => {
    expect(parsePeriod("2026-03")).toEqual({ period: "2026-03", year: 2026, month: 3 });
  });

  it.each(["", undefined, "2026-13", "2026-00", "26-03", "2026-3", "abc"])(
    "falls back to the current month for %o",
    (value) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-13T05:00:00Z"));
      expect(parsePeriod(value)).toEqual({ period: "2026-10", year: 2026, month: 10 });
    }
  );
});

describe("addOneMonth", () => {
  it.each([
    ["2026-05-10", "2026-06-10"],
    ["2026-01-31", "2026-02-28"],
    ["2028-01-31", "2028-02-29"],
    ["2026-12-15", "2027-01-15"],
    ["2026-03-31", "2026-04-30"],
  ])("%s -> %s", (input, expected) => {
    expect(addOneMonth(input)).toBe(expected);
  });

  it("returns an empty string for empty input", () => {
    expect(addOneMonth("")).toBe("");
  });
});

describe("bangkokDate", () => {
  it("returns the Bangkok calendar date", () => {
    expect(bangkokDate(new Date("2026-09-30T17:00:00Z"))).toBe("2026-10-01");
  });
});
