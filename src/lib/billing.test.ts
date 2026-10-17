import { describe, expect, it } from "vitest";
import {
  electricityUnitsUsed,
  hasInvalidOtherItem,
  billCreationError,
  isValidOtherItem,
  pickPreviousMeter,
} from "./billing";

describe("isValidOtherItem", () => {
  it("accepts a named item with a positive amount", () => {
    expect(isValidOtherItem({ name: "ค่ากุญแจ", amount: "50" })).toBe(true);
  });

  it.each([
    { name: "", amount: "50" },
    { name: "  ", amount: "50" },
    { name: "x", amount: "" },
    { name: "x", amount: "0" },
    { name: "x", amount: "-5" },
    { name: "x", amount: "abc" },
  ])("rejects %o", (item) => {
    expect(isValidOtherItem(item)).toBe(false);
  });
});

describe("hasInvalidOtherItem", () => {
  it("ignores fully empty rows", () => {
    expect(hasInvalidOtherItem([{ name: "", amount: "" }])).toBe(false);
  });

  it("accepts complete rows", () => {
    expect(
      hasInvalidOtherItem([
        { name: "a", amount: "10" },
        { name: "", amount: "" },
      ])
    ).toBe(false);
  });

  it("flags half-filled rows and non-positive amounts", () => {
    expect(hasInvalidOtherItem([{ name: "a", amount: "" }])).toBe(true);
    expect(hasInvalidOtherItem([{ name: "", amount: "10" }])).toBe(true);
    expect(hasInvalidOtherItem([{ name: "a", amount: "0" }])).toBe(true);
  });
});

describe("electricityUnitsUsed", () => {
  it("subtracts previous from current meter", () => {
    expect(electricityUnitsUsed(100, "130.5")).toBe(30.5);
  });

  it("returns 0 for missing or invalid readings", () => {
    expect(electricityUnitsUsed(null, "130")).toBe(0);
    expect(electricityUnitsUsed(100, "")).toBe(0);
    expect(electricityUnitsUsed(100, "abc")).toBe(0);
  });

  it("never goes negative", () => {
    expect(electricityUnitsUsed(100, "90")).toBe(0);
  });
});

describe("pickPreviousMeter", () => {
  it("prefers the tenant's own latest bill", () => {
    expect(pickPreviousMeter({ tenantLatest: "250.5", tenantInitial: 100, roomLatest: 90 })).toBe(250.5);
  });

  it("a new tenant starts from their own move-in reading, not the previous tenant's last bill", () => {
    expect(pickPreviousMeter({ tenantLatest: null, tenantInitial: 135, roomLatest: 130 })).toBe(135);
  });

  it("uses the room's last reading only when no move-in reading was recorded", () => {
    expect(pickPreviousMeter({ tenantLatest: undefined, tenantInitial: null, roomLatest: 130 })).toBe(130);
  });

  it("treats 0 as a real reading and returns null when nothing is known", () => {
    expect(pickPreviousMeter({ tenantLatest: 0, tenantInitial: 50, roomLatest: 70 })).toBe(0);
    expect(pickPreviousMeter({ tenantLatest: null, tenantInitial: null, roomLatest: null })).toBeNull();
  });
});

describe("billCreationError", () => {
  const context = { roomCode: "A", month: 3, year: 2026 };

  it("translates the known database errors", () => {
    expect(billCreationError("A bill for this room and billing period already exists", context)).toBe("ห้อง A มีบิล 3/2026 อยู่แล้ว");
    expect(billCreationError("Previous meter does not continue from the last reading (expected 135.00)", context)).toContain("ควรเป็น 135");
    expect(billCreationError("Other amount does not match the sum of the bill items", context)).toContain("ไม่ตรงกับรายการ");
    expect(billCreationError("Billing period is before the tenant move-in date", context)).toContain("ก่อนวันที่ผู้เช่าเข้าอยู่");
    expect(billCreationError("Invalid billing year", context)).toBe("ปีที่เลือกไม่ถูกต้อง");
    expect(billCreationError("Current meter cannot be less than previous meter", context)).toContain("ไม่น้อยกว่า");
  });

  it("passes unknown messages through", () => {
    expect(billCreationError("something else", context)).toBe("something else");
  });
});
