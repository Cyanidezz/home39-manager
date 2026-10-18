import type { BillingRates } from "@/lib/billingRates";
import { addDays, monthDates } from "@/lib/meter";

export const METER_BILL_DUE_DAYS = 7;

export type MeterBillInput = {
  year: number;
  month: number;
  /** Today in Bangkok, "YYYY-MM-DD". */
  today: string;
  tenant: {
    id: string;
    moveInDate: string | null;
    rentWaivedYear: number | null;
    rentWaivedMonth: number | null;
  } | null;
  room: { monthlyRent: number; occupantCount: number };
  rates: BillingRates;
  previousMeter: number | null;
  /** True when the room already has a bill for this month. */
  billExists: boolean;
  /** Usage per date ("YYYY-MM-DD"); a missing key or null means no figure for that day. */
  usageByDate: Record<string, number | null | undefined>;
};

export type MeterBillBlock =
  | { reason: "no-tenant" }
  | { reason: "not-complete" }
  | { reason: "before-move-in" }
  | { reason: "exists" }
  | { reason: "no-previous-meter" }
  | { reason: "missing-days"; missing: string[] };

export type MeterBill = {
  year: number;
  month: number;
  days: number;
  units: number;
  previousMeter: number;
  currentMeter: number;
  rent: number;
  rentWaived: boolean;
  water: number;
  waterRate: number;
  electricityRate: number;
  electricity: number;
  total: number;
  dueDate: string;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

export function meterBillBlockText(block: MeterBillBlock) {
  switch (block.reason) {
    case "no-tenant": return "ห้องนี้ไม่มีผู้เช่าปัจจุบัน";
    case "not-complete": return "เดือนนี้ยังไม่ครบ ออกบิลได้เมื่อสิ้นเดือน";
    case "before-move-in": return "เดือนนี้อยู่ก่อนวันที่ผู้เช่าเข้าอยู่";
    case "exists": return "เดือนนี้ออกบิลแล้ว";
    case "no-previous-meter": return "ยังไม่มีมิเตอร์ครั้งก่อน กรุณากำหนดมิเตอร์เริ่มต้นของผู้เช่าก่อน";
    case "missing-days": return `ยังมี ${block.missing.length} วันที่ไม่มีข้อมูลหน่วยไฟ กรอกให้ครบก่อนออกบิล`;
  }
}

/**
 * The bill for a finished month, worked out from the meter's daily usage. Everything the bill form would ask for is derived
 * here, so the page preview and the one-click issue use the same numbers.
 */
export function computeMeterBill(input: MeterBillInput): { ok: true; bill: MeterBill } | { ok: false; block: MeterBillBlock } {
  const { year, month, tenant } = input;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  if (!tenant) return { ok: false, block: { reason: "no-tenant" } };
  if (period >= input.today.slice(0, 7)) return { ok: false, block: { reason: "not-complete" } };

  const dates = monthDates(period);
  const moveIn = tenant.moveInDate ?? "";
  // Only the days the tenant lived there count (the move-in month starts on the move-in date).
  const billable = dates.filter((date) => date >= moveIn);
  if (billable.length === 0) return { ok: false, block: { reason: "before-move-in" } };
  if (input.billExists) return { ok: false, block: { reason: "exists" } };
  if (input.previousMeter === null) return { ok: false, block: { reason: "no-previous-meter" } };

  const missing = billable.filter((date) => {
    const value = input.usageByDate[date];
    return value === null || value === undefined;
  });
  if (missing.length > 0) return { ok: false, block: { reason: "missing-days", missing } };

  const units = round2(billable.reduce((sum, date) => sum + (input.usageByDate[date] as number), 0));
  const rentWaived = tenant.rentWaivedYear === year && tenant.rentWaivedMonth === month;
  const rent = rentWaived ? 0 : input.room.monthlyRent;
  const water = input.room.occupantCount * input.rates.water;
  const electricity = round2(units * input.rates.electricity);

  return {
    ok: true,
    bill: {
      year,
      month,
      days: billable.length,
      units,
      previousMeter: input.previousMeter,
      currentMeter: round2(input.previousMeter + units),
      rent,
      rentWaived,
      water,
      waterRate: input.rates.water,
      electricityRate: input.rates.electricity,
      electricity,
      total: round2(rent + water + electricity),
      dueDate: addDays(input.today, METER_BILL_DUE_DAYS),
    },
  };
}
