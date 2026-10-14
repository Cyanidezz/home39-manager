import { describe, expect, it } from "vitest";
import {
  summarizeMonth,
  type DashboardBill,
  type DashboardExpense,
  type DashboardRoom,
} from "./dashboard";

const bill = (overrides: Partial<DashboardBill>): DashboardBill => ({
  id: "b",
  room_id: "r1",
  rent_amount: 0,
  water_amount: 0,
  electricity_amount: 0,
  electricity_units: 0,
  other_amount: 0,
  total_amount: 0,
  status: "unpaid",
  ...overrides,
});

const rooms: DashboardRoom[] = [
  {
    id: "r1",
    room_code: "A",
    monthly_rent: 5000,
    occupant_count: 1,
    status: "occupied",
    tenants: [
      { full_name: "T1", planned_move_out_date: "2026-11-01", is_active: true, line_user_id: null },
      { full_name: "Old", planned_move_out_date: null, is_active: false, line_user_id: null },
    ],
  },
  { id: "r2", room_code: "B", monthly_rent: 4500, occupant_count: 0, status: "vacant", tenants: null },
];

describe("summarizeMonth", () => {
  const bills = [
    bill({ id: "1", room_id: "r1", status: "paid", rent_amount: 5000, water_amount: 150, electricity_amount: 70, electricity_units: 10, other_amount: 30, total_amount: 5250 }),
    bill({ id: "2", room_id: "r2", status: "unpaid", total_amount: 4000 }),
    bill({ id: "3", room_id: "r3", status: "draft", total_amount: 999 }),
    bill({ id: "4", room_id: "r4", status: "slip_submitted", total_amount: 100 }),
  ];
  const expenses: DashboardExpense[] = [
    { id: "e1", category: "water", amount: 60 },
    { id: "e2", category: "electricity", amount: "40" },
    { id: "e3", category: "other", amount: 100 },
  ];
  const summary = summarizeMonth(rooms, bills, expenses);

  it("excludes drafts from issued totals", () => {
    expect(summary.totalIssued).toBe(5250 + 4000 + 100);
    expect(summary.issuedBills).toHaveLength(3);
  });

  it("splits received and outstanding", () => {
    expect(summary.totalReceived).toBe(5250);
    expect(summary.totalOutstanding).toBe(4100);
    expect(summary.outstandingBills).toHaveLength(2);
  });

  it("computes net profit from received minus expenses", () => {
    expect(summary.totalExpenses).toBe(200);
    expect(summary.netProfit).toBe(5050);
  });

  it("breaks out utilities", () => {
    expect(summary.water).toEqual({ billed: 150, received: 150, paid: 60 });
    expect(summary.electricity).toEqual({ billed: 70, received: 70, paid: 40, units: 10 });
  });

  it("counts rooms, tenants and pending slips", () => {
    expect(summary.occupiedRooms).toHaveLength(1);
    expect(summary.vacantRooms).toHaveLength(1);
    expect(summary.movingOutTenants).toHaveLength(1);
    expect(summary.unlinkedTenants).toHaveLength(1);
    expect(summary.pendingSlips).toHaveLength(1);
  });
});
