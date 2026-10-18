import { describe, expect, it } from "vitest";
import { compareChecks } from "./meterChecks";

const totals = { "2026-10-12": 363.568, "2026-10-18": 394.366, "2026-10-19": 395.841 };

describe("compareChecks", () => {
  it("compares the disc difference with the smart meter total at the end of the day before each reading", () => {
    const result = compareChecks(
      [
        { check_date: "2026-10-13", disc_reading: 5555 },
        { check_date: "2026-10-19", disc_reading: "5585.5" },
      ],
      totals
    );
    expect(result).toEqual([{ from: "2026-10-13", to: "2026-10-19", disc: 30.5, tuya: 30.798, diffPercent: 1 }]);
  });

  it("lists the newest span first and handles unordered input", () => {
    const result = compareChecks(
      [
        { check_date: "2026-10-20", disc_reading: 5590 },
        { check_date: "2026-10-13", disc_reading: 5555 },
        { check_date: "2026-10-19", disc_reading: 5585.5 },
      ],
      totals
    );
    expect(result.map((row) => [row.from, row.to])).toEqual([["2026-10-19", "2026-10-20"], ["2026-10-13", "2026-10-19"]]);
  });

  it("leaves the smart meter side empty when its totals are missing or went down", () => {
    expect(compareChecks([{ check_date: "2026-10-01", disc_reading: 100 }, { check_date: "2026-10-05", disc_reading: 120 }], totals)[0]).toMatchObject({ tuya: null, diffPercent: null, disc: 20 });
    expect(compareChecks([{ check_date: "2026-10-13", disc_reading: 100 }, { check_date: "2026-10-19", disc_reading: 120 }], { "2026-10-12": 500, "2026-10-18": 10 })[0].tuya).toBeNull();
  });

  it("needs at least two readings and no percentage without disc usage", () => {
    expect(compareChecks([{ check_date: "2026-10-13", disc_reading: 100 }], totals)).toEqual([]);
    expect(compareChecks([{ check_date: "2026-10-13", disc_reading: 100 }, { check_date: "2026-10-19", disc_reading: 100 }], totals)[0].diffPercent).toBeNull();
  });
});
