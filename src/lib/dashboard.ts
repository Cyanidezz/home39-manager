export type DashboardTenant = {
  full_name: string;
  planned_move_out_date: string | null;
  is_active: boolean;
  line_user_id: string | null;
};

export type DashboardRoom = {
  id: string;
  room_code: string;
  monthly_rent: number | string | null;
  occupant_count: number;
  status: string;
  tenants: DashboardTenant[] | null;
};

export type DashboardBill = {
  id: string;
  room_id: string;
  rent_amount: number | string | null;
  water_amount: number | string | null;
  electricity_amount: number | string | null;
  electricity_units: number | string | null;
  other_amount: number | string | null;
  total_amount: number | string | null;
  status: string;
};

export type DashboardExpense = {
  id: string;
  category: string;
  amount: number | string | null;
};

type BillField =
  | "rent_amount"
  | "water_amount"
  | "electricity_amount"
  | "electricity_units"
  | "other_amount"
  | "total_amount";

const sum = <T,>(rows: T[], pick: (row: T) => number | string | null) =>
  rows.reduce((total, row) => total + Number(pick(row) || 0), 0);

export function summarizeMonth(
  rooms: DashboardRoom[],
  bills: DashboardBill[],
  expenses: DashboardExpense[]
) {
  const issuedBills = bills.filter((bill) => bill.status !== "draft");
  const paidBills = bills.filter((bill) => bill.status === "paid");
  const outstandingBills = issuedBills.filter((bill) => bill.status !== "paid");
  const sumBills = (rows: DashboardBill[], field: BillField) =>
    sum(rows, (row) => row[field]);
  const expensesFor = (category: string) =>
    sum(
      expenses.filter((expense) => expense.category === category),
      (expense) => expense.amount
    );

  const totalReceived = sumBills(paidBills, "total_amount");
  const totalExpenses = sum(expenses, (expense) => expense.amount);
  const activeTenants = rooms.flatMap((room) =>
    (room.tenants || []).filter((tenant) => tenant.is_active)
  );

  return {
    issuedBills,
    paidBills,
    outstandingBills,
    expenseCount: expenses.length,
    totalIssued: sumBills(issuedBills, "total_amount"),
    totalReceived,
    totalOutstanding: sumBills(outstandingBills, "total_amount"),
    totalExpenses,
    netProfit: totalReceived - totalExpenses,
    rentReceived: sumBills(paidBills, "rent_amount"),
    otherReceived: sumBills(paidBills, "other_amount"),
    water: {
      billed: sumBills(issuedBills, "water_amount"),
      received: sumBills(paidBills, "water_amount"),
      paid: expensesFor("water"),
    },
    electricity: {
      billed: sumBills(issuedBills, "electricity_amount"),
      received: sumBills(paidBills, "electricity_amount"),
      paid: expensesFor("electricity"),
      units: sumBills(issuedBills, "electricity_units"),
    },
    occupiedRooms: rooms.filter((room) => room.status === "occupied"),
    vacantRooms: rooms.filter((room) => room.status !== "occupied"),
    movingOutTenants: activeTenants.filter(
      (tenant) => tenant.planned_move_out_date
    ),
    unlinkedTenants: activeTenants.filter((tenant) => !tenant.line_user_id),
    pendingSlips: bills.filter((bill) =>
      ["slip_submitted", "verifying"].includes(bill.status)
    ),
    billsByRoom: new Map(bills.map((bill) => [bill.room_id, bill])),
  };
}

export type MonthSummary = ReturnType<typeof summarizeMonth>;
