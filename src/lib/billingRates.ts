import { ELECTRICITY_RATE, WATER_RATE } from "@/lib/billing";

export type BillingRates = { water: number; electricity: number };

/** Used until the rates are saved in the settings (the rates the dorm started with). */
export const DEFAULT_BILLING_RATES: BillingRates = { water: WATER_RATE, electricity: ELECTRICITY_RATE };

/** A rate typed in the settings form: a positive number up to `max`, rounded to 2 decimals; otherwise null. */
export function parseRate(value: string, max: number) {
  if (value.trim() === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > max) return null;
  return Math.round(number * 100) / 100;
}

export const MAX_WATER_RATE = 10000;
export const MAX_ELECTRICITY_RATE = 1000;
