import { addDays } from "@/lib/meter";

export type MeterCheck = { id: string; check_date: string; disc_reading: number | string; note: string | null };

export type CheckComparison = {
  from: string;
  to: string;
  disc: number;
  /** Units the smart meter counted over the same span, or null when its totals are missing for either end. */
  tuya: number | null;
  /** (tuya - disc) / disc as a percentage, or null when it can't be worked out. */
  diffPercent: number | null;
};

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/**
 * Compares consecutive disc readings with the smart meter. A reading noted on a date is matched with the smart meter's total at the
 * end of the day before, i.e. midnight at the start of that date (the disc is read in the morning, before that day's use).
 */
export function compareChecks(checks: Pick<MeterCheck, "check_date" | "disc_reading">[], endTotals: Record<string, number>): CheckComparison[] {
  const sorted = [...checks].sort((a, b) => a.check_date.localeCompare(b.check_date));
  const totalAt = (date: string) => endTotals[addDays(date, -1)];
  const result: CheckComparison[] = [];
  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const disc = round(Number(current.disc_reading) - Number(previous.disc_reading), 2);
    const start = totalAt(previous.check_date);
    const end = totalAt(current.check_date);
    const tuya = start !== undefined && end !== undefined && end >= start ? round(end - start, 3) : null;
    result.push({
      from: previous.check_date,
      to: current.check_date,
      disc,
      tuya,
      diffPercent: tuya !== null && disc > 0 ? round(((tuya - disc) / disc) * 100, 1) : null,
    });
  }
  return result.reverse();
}
