import { ELECTRICITY_RATE, WATER_RATE } from "@/lib/billing";

/** One deduction typed by the admin (damage, cleaning, lost key ...). */
export type DeductionItem = { name: string; amount: string };

export type SettlementParts = {
  deposit: number;
  electricity: number;
  water: number;
  items: number;
  outstandingBills: number;
};

const roundBaht = (value: number) => Math.round(value * 100) / 100;

/** Electricity from the last billed reading to the reading taken at move-out. */
export function electricityDeduction(previousMeter: number | null, finalMeter: string, rate = ELECTRICITY_RATE) {
  if (previousMeter === null || finalMeter.trim() === "") return 0;
  const final = Number(finalMeter);
  if (!Number.isFinite(final)) return 0;
  return roundBaht(Math.max(0, final - previousMeter) * rate);
}

/** Starting point for the last water charge: the people billed last time, at the usual rate. */
export function suggestedWater(occupants: number | null | undefined, rate = WATER_RATE) {
  return roundBaht(Math.max(0, occupants ?? 0) * rate);
}

/** Total of the deduction rows; rows with no name or no positive amount are left out. */
export function itemsTotal(items: DeductionItem[]) {
  return roundBaht(
    items.reduce((sum, item) => {
      const amount = Number(item.amount);
      return item.name.trim() !== "" && Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
    }, 0)
  );
}

/** A row that is half filled in or has an amount that is not above zero. */
export function hasInvalidDeduction(items: DeductionItem[]) {
  return items.some((item) => {
    const hasName = item.name.trim() !== "";
    const hasAmount = item.amount.trim() !== "";
    if (!hasName && !hasAmount) return false;
    const amount = Number(item.amount);
    return !hasName || !Number.isFinite(amount) || amount <= 0;
  });
}

/** Same arithmetic as save_move_out_settlement, for the live figures on the form. Negative refund = the tenant still owes. */
export function settlementTotals(parts: SettlementParts) {
  const deductions = roundBaht(parts.electricity + parts.water + parts.items + parts.outstandingBills);
  return { deductions, refund: roundBaht(parts.deposit - deductions) };
}

export type SettlementState = "none" | "open" | "closed";

/** Where a moved-out tenant's settlement stands, for the room page. */
export function settlementState(settlement: { status: string } | null | undefined): SettlementState {
  if (!settlement) return "none";
  if (settlement.status === "closed") return "closed";
  return "open";
}
