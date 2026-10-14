export const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function formatMoney(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  });
}

/** "5 ก.ย. 2569" */
export function formatThaiDate(date: string | null | undefined) {
  if (!date) return "-";
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${thaiMonths[month - 1]} ${year + 543}`;
}

/** "05/09/2569" */
export function formatThaiDateShort(date: string | null | undefined) {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${Number(year) + 543}`;
}

/** "ก.ย. 2569" from "YYYY-MM" or "YYYY-MM-DD" */
export function formatThaiMonth(date: string | null | undefined) {
  if (!date) return "-";
  const [year, month] = date.split("-").map(Number);
  return `${thaiMonths[month - 1]} ${year + 543}`;
}

/** Today's date in Bangkok as "YYYY-MM-DD" (the server runs in UTC). */
export function bangkokDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** Current month in Bangkok as "YYYY-MM" */
export function currentPeriod(now = new Date()) {
  return bangkokDate(now).slice(0, 7);
}

export const thaiMonthNames = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** Parses a `?month=YYYY-MM` value, falling back to the current month. */
export function parsePeriod(value: string | undefined) {
  const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "")
    ? value!
    : currentPeriod();
  const [year, month] = period.split("-").map(Number);
  return { period, year, month };
}
