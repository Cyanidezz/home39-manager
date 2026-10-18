import { bangkokDate } from "@/lib/format";

export type MeterDay = {
  usage_date: string;
  kwh: number | string | null;
  source: string;
  note: string | null;
};

export const METER_HISTORY_DAYS = 31;

const DAY_MS = 86_400_000;

/** The Bangkok calendar day before `now`, which is the day the midnight job records. */
export function previousBangkokDate(now = new Date()) {
  return bangkokDate(new Date(now.getTime() - DAY_MS));
}

export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** `days` consecutive dates ending at `last`, newest first, each paired with its stored row (or null when missing). */
export function dailySeries(rows: MeterDay[], last: string, days: number) {
  const byDate = new Map(rows.map((row) => [row.usage_date, row]));
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(last, -index);
    const row = byDate.get(date) ?? null;
    return { date, row, kwh: row && row.kwh !== null ? Number(row.kwh) : null };
  });
}

export function usageSummary(series: { kwh: number | null }[], windowDays = 7) {
  const recent = series.slice(0, windowDays).filter((day) => day.kwh !== null) as { kwh: number }[];
  const total = recent.reduce((sum, day) => sum + day.kwh, 0);
  return {
    total: Math.round(total * 100) / 100,
    daysWithData: recent.length,
    average: recent.length ? Math.round((total / recent.length) * 100) / 100 : null,
  };
}

/** The first month shown on the meter page (the month the meter data starts). */
export const METER_START_PERIOD = "2026-10";

/** "YYYY-MM" moved by `delta` months. */
export function shiftPeriod(period: string, delta: number) {
  const [year, month] = period.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1 + delta, 1));
  return moved.toISOString().slice(0, 7);
}

/** Every date of the month "YYYY-MM", oldest first. */
export function monthDates(period: string) {
  const first = `${period}-01`;
  const next = `${shiftPeriod(period, 1)}-01`;
  const count = Math.round((Date.parse(`${next}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / DAY_MS);
  return Array.from({ length: count }, (_, index) => addDays(first, index));
}
