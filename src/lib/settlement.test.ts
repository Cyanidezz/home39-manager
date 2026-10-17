import { describe, expect, it } from "vitest";
import {
  electricityDeduction,
  hasInvalidDeduction,
  itemsTotal,
  settlementState,
  settlementTotals,
  suggestedWater,
} from "./settlement";

describe("electricityDeduction", () => {
  it("หน่วยที่ใช้ตั้งแต่บิลล่าสุด × 7 บาท", () => {
    expect(electricityDeduction(100, "140")).toBe(280);
    expect(electricityDeduction(100.5, "101")).toBe(3.5);
  });
  it("ไม่มีเลขก่อนหน้า เลขว่าง หรือเลขไม่ถูกต้อง = 0 และเลขที่ต่ำกว่าเดิมไม่ติดลบ", () => {
    expect(electricityDeduction(null, "140")).toBe(0);
    expect(electricityDeduction(100, "")).toBe(0);
    expect(electricityDeduction(100, "abc")).toBe(0);
    expect(electricityDeduction(100, "90")).toBe(0);
  });
});

describe("suggestedWater", () => {
  it("150 บาทต่อคน และไม่มีข้อมูลคนอยู่ = 0", () => {
    expect(suggestedWater(2)).toBe(300);
    expect(suggestedWater(null)).toBe(0);
    expect(suggestedWater(-1)).toBe(0);
  });
});

describe("itemsTotal / hasInvalidDeduction", () => {
  const rows = [
    { name: "ผนังมีรอย", amount: "1500" },
    { name: "ทำความสะอาด", amount: "500.50" },
    { name: "", amount: "" },
  ];
  it("รวมเฉพาะแถวที่ชื่อและจำนวนเงินครบ", () => {
    expect(itemsTotal(rows)).toBe(2000.5);
    expect(itemsTotal([{ name: "x", amount: "0" }, { name: "", amount: "100" }, { name: "y", amount: "-5" }])).toBe(0);
  });
  it("แถวว่างทั้งแถวไม่ผิด แต่แถวที่กรอกไม่ครบหรือจำนวนไม่เกิน 0 ผิด", () => {
    expect(hasInvalidDeduction(rows)).toBe(false);
    expect(hasInvalidDeduction([{ name: "ซ่อมประตู", amount: "" }])).toBe(true);
    expect(hasInvalidDeduction([{ name: "", amount: "100" }])).toBe(true);
    expect(hasInvalidDeduction([{ name: "ซ่อม", amount: "0" }])).toBe(true);
  });
});

describe("settlementTotals", () => {
  it("มัดจำ 10,000 หักไฟ 280 น้ำ 300 เสียหาย 2,000 -> คืน 7,420", () => {
    expect(settlementTotals({ deposit: 10000, electricity: 280, water: 300, items: 2000, outstandingBills: 0 })).toEqual({ deductions: 2580, refund: 7420 });
  });
  it("บิลค้างถูกรวมในยอดหัก และมัดจำไม่พอ = ติดลบ", () => {
    expect(settlementTotals({ deposit: 10000, electricity: 0, water: 0, items: 12000, outstandingBills: 0 }).refund).toBe(-2000);
    expect(settlementTotals({ deposit: 10000, electricity: 100, water: 0, items: 0, outstandingBills: 5510 }).refund).toBe(4390);
  });
  it("ไม่เกิดเศษทศนิยมลอย", () => {
    expect(settlementTotals({ deposit: 100, electricity: 0.1, water: 0.2, items: 0, outstandingBills: 0 })).toEqual({ deductions: 0.3, refund: 99.7 });
  });
});

describe("settlementState", () => {
  it("ยังไม่มีใบสรุป / กำลังทำ / ปิดแล้ว", () => {
    expect(settlementState(null)).toBe("none");
    expect(settlementState({ status: "open" })).toBe("open");
    expect(settlementState({ status: "closed" })).toBe("closed");
  });
});
