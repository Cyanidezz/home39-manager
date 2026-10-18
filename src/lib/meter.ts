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
