import { describe, expect, it } from "vitest";
import { addDays, dailySeries, previousBangkokDate, usageSummary } from "./meter";

describe("previousBangkokDate", () => {
  it("is the Bangkok day before the run time", () => {
    // 17:05 UTC on the 19th = 00:05 on the 20th in Bangkok -> record the 19th
    expect(previousBangkokDate(new Date("2026-10-19T17:05:00Z"))).toBe("2026-10-19");
    // an hour-late run is still the same Bangkok morning
    expect(previousBangkokDate(new Date("2026-10-19T17:50:00Z"))).toBe("2026-10-19");
  });
  it("crosses month ends", () => {
    expect(previousBangkokDate(new Date("2026-10-31T17:00:00Z"))).toBe("2026-10-31");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
  });
});

describe("dailySeries / usageSummary", () => {
  const rows = [
    { usage_date: "2026-10-19", kwh: "12.5", source: "tuya", note: null },
    { usage_date: "2026-10-17", kwh: 7.5, source: "manual", note: null },
    { usage_date: "2026-10-16", kwh: null, source: "tuya", note: null },
  ];
  it("fills gaps newest first", () => {
    const series = dailySeries(rows, "2026-10-19", 4);
    expect(series.map((day) => [day.date, day.kwh])).toEqual([
      ["2026-10-19", 12.5], ["2026-10-18", null], ["2026-10-17", 7.5], ["2026-10-16", null],
    ]);
  });
  it("sums and averages only the days with data", () => {
    expect(usageSummary(dailySeries(rows, "2026-10-19", 14), 7)).toEqual({ total: 20, daysWithData: 2, average: 10 });
    expect(usageSummary([], 7)).toEqual({ total: 0, daysWithData: 0, average: null });
  });
});

import { monthDates, shiftPeriod } from "./meter";

describe("month helpers", () => {
  it("shifts across years", () => {
    expect(shiftPeriod("2026-10", 1)).toBe("2026-11");
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
  });
  it("lists every date of a month", () => {
    expect(monthDates("2026-10")).toHaveLength(31);
    expect(monthDates("2026-11")).toHaveLength(30);
    expect(monthDates("2028-02")).toHaveLength(29);
    expect(monthDates("2026-10")[0]).toBe("2026-10-01");
    expect(monthDates("2026-10")[30]).toBe("2026-10-31");
  });
});

import { parseDateRange, rangeDays } from "./meter";

describe("parseDateRange", () => {
  const today = "2026-10-19";
  it("orders the dates and keeps a single date as one day", () => {
    expect(parseDateRange("2026-10-12", "2026-10-05", today)).toEqual({ from: "2026-10-05", to: "2026-10-12" });
    expect(parseDateRange("2026-10-12", undefined, today)).toEqual({ from: "2026-10-12", to: "2026-10-12" });
    expect(parseDateRange(undefined, "2026-10-12", today)).toEqual({ from: "2026-10-12", to: "2026-10-12" });
  });
  it("clamps to the start of the data and to today", () => {
    expect(parseDateRange("2026-09-20", "2026-10-03", today)).toEqual({ from: "2026-10-01", to: "2026-10-03" });
    expect(parseDateRange("2026-10-15", "2026-12-31", today)).toEqual({ from: "2026-10-15", to: today });
  });
  it("ignores unusable input", () => {
    expect(parseDateRange("x", "2026-13-45", today)).toBeNull();
    expect(parseDateRange(undefined, undefined, today)).toBeNull();
    expect(parseDateRange("2026-09-01", "2026-09-30", today)).toBeNull();
    expect(parseDateRange("2026-11-01", "2026-11-05", today)).toBeNull();
  });
  it("counts days inclusively", () => {
    expect(rangeDays("2026-10-13", "2026-10-18")).toBe(6);
    expect(rangeDays("2026-10-31", "2026-11-02")).toBe(3);
  });
});

import { differencePercent, tuyaDayUsage } from "./meter";

describe("tuya comparison", () => {
  const totals = { "2026-10-12": 363.568, "2026-10-13": 368.766, "2026-10-15": 378.682 };
  it("works out a day from two consecutive totals", () => {
    expect(tuyaDayUsage(totals, "2026-10-13")).toBe(5.198);
    expect(tuyaDayUsage(totals, "2026-10-14")).toBeNull();
    expect(tuyaDayUsage(totals, "2026-10-15")).toBeNull();
    expect(tuyaDayUsage({ "2026-10-12": 500, "2026-10-13": 10 }, "2026-10-13")).toBeNull();
  });
  it("gives the difference as a percent of the typed-in figure", () => {
    expect(differencePercent(5, 5.2)).toBe(4);
    expect(differencePercent(5.2, 5)).toBe(-3.8);
    expect(differencePercent(0, 5)).toBeNull();
  });
});
