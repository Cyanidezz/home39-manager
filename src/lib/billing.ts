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
