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
