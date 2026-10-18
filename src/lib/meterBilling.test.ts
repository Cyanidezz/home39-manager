import { describe, expect, it } from "vitest";
import { computeMeterBill, type MeterBillInput } from "./meterBilling";
import { monthDates } from "./meter";

const fullMonth = (period: string, kwh: number) => Object.fromEntries(monthDates(period).map((date) => [date, kwh]));

const base: MeterBillInput = {
  year: 2026,
  month: 10,
  today: "2026-11-01",
  tenant: { id: "t", moveInDate: "2026-09-01", rentWaivedYear: null, rentWaivedMonth: null },
  room: { monthlyRent: 5000, occupantCount: 2 },
  rates: { water: 150, electricity: 7 },
  previousMeter: 100,
  billExists: false,
  usageByDate: fullMonth("2026-10", 5),
};

describe("computeMeterBill", () => {
  it("sums the month and prices it like the bill form", () => {
    const result = computeMeterBill(base);
    expect(result).toEqual({
      ok: true,
      bill: {
        year: 2026, month: 10, days: 31, units: 155, previousMeter: 100, currentMeter: 255,
        rent: 5000, rentWaived: false, water: 300, waterRate: 150, electricityRate: 7, electricity: 1085, total: 6385, dueDate: "2026-11-08",
      },
    });
  });

  it("rounds units to 2 decimals so previous + units = current", () => {
    const result = computeMeterBill({ ...base, usageByDate: fullMonth("2026-10", 5.123) });
    expect(result.ok && result.bill.units).toBe(158.81);
    expect(result.ok && result.bill.currentMeter).toBe(258.81);
  });

  it("charges no rent in the month paid by the advance rent", () => {
    const result = computeMeterBill({ ...base, tenant: { ...base.tenant!, rentWaivedYear: 2026, rentWaivedMonth: 10 } });
    expect(result.ok && [result.bill.rent, result.bill.rentWaived, result.bill.total]).toEqual([0, true, 1385]);
  });

  it("counts only the days from move-in in the move-in month", () => {
    const result = computeMeterBill({ ...base, tenant: { ...base.tenant!, moveInDate: "2026-10-20" }, usageByDate: { ...fullMonth("2026-10", 5), "2026-10-05": null } });
    expect(result.ok && [result.bill.days, result.bill.units]).toEqual([12, 60]);
  });

  it("uses the rates it is given", () => {
    const result = computeMeterBill({ ...base, rates: { water: 200, electricity: 8.5 } });
    expect(result.ok && [result.bill.water, result.bill.electricity, result.bill.total, result.bill.waterRate, result.bill.electricityRate]).toEqual([400, 1317.5, 6717.5, 200, 8.5]);
  });

  it("is blocked until the month is over", () => {
    expect(computeMeterBill({ ...base, today: "2026-10-31" })).toEqual({ ok: false, block: { reason: "not-complete" } });
  });

  it("is blocked when days are missing and names them", () => {
    const usage: Record<string, number | null> = { ...fullMonth("2026-10", 5), "2026-10-04": null };
    delete usage["2026-10-09"];
    expect(computeMeterBill({ ...base, usageByDate: usage })).toEqual({
      ok: false, block: { reason: "missing-days", missing: ["2026-10-04", "2026-10-09"] },
    });
  });

  it("is blocked without a tenant, a previous meter, or when the bill exists / before move-in", () => {
    expect(computeMeterBill({ ...base, tenant: null })).toEqual({ ok: false, block: { reason: "no-tenant" } });
    expect(computeMeterBill({ ...base, previousMeter: null })).toEqual({ ok: false, block: { reason: "no-previous-meter" } });
    expect(computeMeterBill({ ...base, billExists: true })).toEqual({ ok: false, block: { reason: "exists" } });
    expect(computeMeterBill({ ...base, tenant: { ...base.tenant!, moveInDate: "2026-11-05" } })).toEqual({ ok: false, block: { reason: "before-move-in" } });
  });
});
