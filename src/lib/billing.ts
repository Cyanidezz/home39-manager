export const WATER_RATE = 150;
export const ELECTRICITY_RATE = 7;

export type OtherItem = {
  name: string;
  amount: string;
};

export function isValidOtherItem(item: OtherItem) {
  return (
    item.name.trim() !== "" &&
    item.amount !== "" &&
    Number.isFinite(Number(item.amount)) &&
    Number(item.amount) > 0
  );
}

/** A row is invalid when it is partly filled or its amount is not positive. */
export function hasInvalidOtherItem(items: OtherItem[]) {
  return items.some((item) => {
    const hasName = item.name.trim() !== "";
    const hasAmount = item.amount !== "";
    if (!hasName && !hasAmount) return false;
    return !isValidOtherItem(item);
  });
}

export function electricityUnitsUsed(
  previousMeter: number | null,
  currentMeter: string
) {
  if (previousMeter === null || currentMeter === "") return 0;
  const current = Number(currentMeter);
  if (!Number.isFinite(current)) return 0;
  return Math.max(0, current - previousMeter);
}

/**
 * Previous meter reading for a tenant's next bill: their own latest bill, else the reading
 * recorded when they moved in, else (nothing recorded) the room's last reading from whoever lived there before.
 */
export function pickPreviousMeter(readings: {
  tenantLatest: number | string | null | undefined;
  tenantInitial: number | string | null | undefined;
  roomLatest: number | string | null | undefined;
}) {
  for (const value of [readings.tenantLatest, readings.tenantInitial, readings.roomLatest]) {
    if (value !== null && value !== undefined && value !== "") return Number(value);
  }
  return null;
}

/** Thai text for the errors create_bill_with_items raises; unknown messages pass through unchanged. */
export function billCreationError(
  message: string,
  context: { roomCode: string; month: number; year: number }
) {
  if (message.includes("already exists")) {
    return `ห้อง ${context.roomCode} มีบิล ${context.month}/${context.year} อยู่แล้ว`;
  }
  if (message.includes("Previous meter does not continue")) {
    const expected = message.match(/expected ([\d.]+)/)?.[1];
    return `มิเตอร์ครั้งก่อนไม่ต่อเนื่องกับค่าล่าสุด${expected ? ` (ควรเป็น ${Number(expected)})` : ""} กรุณารีเฟรชหน้านี้แล้วลองใหม่`;
  }
  if (message.includes("Other amount does not match")) {
    return "ยอดค่าใช้จ่ายอื่นไม่ตรงกับรายการที่กรอก กรุณาตรวจรายการแล้วลองใหม่";
  }
  if (message.includes("before the tenant move-in date")) {
    return "เดือนที่ออกบิลอยู่ก่อนวันที่ผู้เช่าเข้าอยู่";
  }
  if (message.includes("Invalid billing year")) {
    return "ปีที่เลือกไม่ถูกต้อง";
  }
  if (message.includes("Current meter cannot be less")) {
    return "มิเตอร์ครั้งนี้ต้องไม่น้อยกว่ามิเตอร์ครั้งก่อน";
  }
  return message;
}
