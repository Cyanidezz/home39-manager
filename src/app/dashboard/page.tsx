import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ month?: string }>;
};

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

function formatThaiDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${thaiMonths[month - 1]} ${year + 543}`;
}

function formatPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  return `${thaiMonths[month - 1]} ${year + 543}`;
}

function money(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function DashboardPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const query = await searchParams;
  const selectedPeriod = /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month || "")
    ? query.month!
    : currentPeriod();
  const [year, month] = selectedPeriod.split("-").map(Number);

  const [roomsResult, billsResult, expensesResult] = await Promise.all([
    supabase
      .from("rooms")
      .select(
        "id, room_code, monthly_rent, occupant_count, status, tenants(full_name, planned_move_out_date, is_active, line_user_id)"
      )
      .order("room_code"),
    supabase
      .from("bills")
      .select(
        "id, room_id, rent_amount, water_amount, electricity_amount, electricity_units, other_amount, total_amount, status"
      )
      .eq("billing_year", year)
      .eq("billing_month", month),
    supabase
      .from("expenses")
      .select("id, category, amount")
      .eq("billing_year", year)
      .eq("billing_month", month),
  ]);

  const rooms = roomsResult.data || [];
  const bills = billsResult.data || [];
  const expenses = expensesResult.data || [];
  const pageError =
    roomsResult.error || billsResult.error || expensesResult.error;

  const issuedBills = bills.filter((bill) => bill.status !== "draft");
  const paidBills = bills.filter((bill) => bill.status === "paid");
  const outstandingBills = bills.filter(
    (bill) => bill.status !== "paid" && bill.status !== "draft"
  );

  const sumBills = (
    rows: typeof bills,
    field:
      | "rent_amount"
      | "water_amount"
      | "electricity_amount"
      | "electricity_units"
      | "other_amount"
      | "total_amount"
  ) => rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);

  const totalIssued = sumBills(issuedBills, "total_amount");
  const totalReceived = sumBills(paidBills, "total_amount");
  const totalOutstanding = sumBills(outstandingBills, "total_amount");
  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );
  const netProfit = totalReceived - totalExpenses;

  const rentReceived = sumBills(paidBills, "rent_amount");
  const otherReceived = sumBills(paidBills, "other_amount");

  const waterBilled = sumBills(issuedBills, "water_amount");
  const waterReceived = sumBills(paidBills, "water_amount");
  const waterPaid = expenses
    .filter((expense) => expense.category === "water")
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const electricityBilled = sumBills(issuedBills, "electricity_amount");
  const electricityReceived = sumBills(paidBills, "electricity_amount");
  const electricityUnits = sumBills(issuedBills, "electricity_units");
  const electricityPaid = expenses
    .filter((expense) => expense.category === "electricity")
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const occupiedRooms = rooms.filter((room) => room.status === "occupied");
  const vacantRooms = rooms.filter((room) => room.status !== "occupied");
  const movingOutTenants = rooms.flatMap((room) =>
    (room.tenants || []).filter(
      (tenant) => tenant.is_active && tenant.planned_move_out_date
    )
  );
  const unlinkedTenants = rooms.flatMap((room) =>
    (room.tenants || []).filter(
      (tenant) => tenant.is_active && !tenant.line_user_id
    )
  );
  const pendingSlips = bills.filter((bill) =>
    ["slip_submitted", "verifying"].includes(bill.status)
  );
  const billsByRoom = new Map(bills.map((bill) => [bill.room_id, bill]));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              ภาพรวมประจำเดือน
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              รายรับ รายจ่าย และสถานะห้องพัก · {formatPeriod(selectedPeriod)}
            </p>
          </div>

          <form className="flex items-end gap-2">
            <div>
              <label htmlFor="month" className="sr-only">เดือนที่แสดง</label>
              <input
                id="month"
                name="month"
                type="month"
                defaultValue={selectedPeriod}
                className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              type="submit"
              className="h-11 rounded-lg border border-blue-200 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              ดูข้อมูล
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        {pageError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            โหลดข้อมูลบางส่วนไม่สำเร็จ: {pageError.message}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "ยอดเรียกเก็บ",
              value: totalIssued,
              detail: `${issuedBills.length} บิล`,
              icon: "▤",
              valueClass: "text-slate-900",
              iconClass: "bg-blue-50 text-blue-600",
            },
            {
              label: "รับเงินจริง",
              value: totalReceived,
              detail: `${paidBills.length} บิลชำระแล้ว`,
              icon: "▣",
              valueClass: "text-emerald-600",
              iconClass: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "ยอดค้างชำระ",
              value: totalOutstanding,
              detail: `${outstandingBills.length} บิลค้าง`,
              icon: "!",
              valueClass: "text-amber-600",
              iconClass: "bg-amber-50 text-amber-600",
            },
            {
              label: "รายจ่ายจริง",
              value: totalExpenses,
              detail: `${expenses.length} รายการ`,
              icon: "฿",
              valueClass: "text-red-600",
              iconClass: "bg-red-50 text-red-600",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold text-slate-600">{card.label}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <strong className={`text-2xl tracking-tight ${card.valueClass}`}>
                  {money(card.value)}
                </strong>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${card.iconClass}`}>
                  {card.icon}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">{card.detail}</p>
            </div>
          ))}

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-lg shadow-blue-200">
            <div className="absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-blue-400/30" />
            <div className="absolute bottom-0 right-0 h-12 w-28 -skew-x-12 bg-blue-500/40" />
            <p className="relative text-xs font-semibold text-blue-100">
              {netProfit >= 0 ? "กำไรสุทธิ" : "ขาดทุนสุทธิ"}
            </p>
            <div className="relative mt-3 flex items-center justify-between gap-3">
              <strong className="text-2xl tracking-tight">
                {money(Math.abs(netProfit))}
              </strong>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/20 font-bold">
                ฿
              </span>
            </div>
            <p className="relative mt-2 text-xs text-blue-100">
              เงินรับจริง − รายจ่ายจริง
            </p>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          {[
            {
              title: "วิเคราะห์ค่าน้ำ",
              subtitle: "เปรียบเทียบยอดเรียกเก็บกับต้นทุนจริง",
              icon: "💧",
              billed: waterBilled,
              received: waterReceived,
              paid: waterPaid,
            },
            {
              title: "วิเคราะห์ค่าไฟ",
              subtitle: `ผู้เช่าใช้รวม ${electricityUnits.toLocaleString("th-TH")} หน่วย`,
              icon: "💡",
              billed: electricityBilled,
              received: electricityReceived,
              paid: electricityPaid,
            },
          ].map((utility) => {
            const margin = utility.received - utility.paid;
            return (
              <div
                key={utility.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                      {utility.icon}
                    </span>
                    <div>
                      <h2 className="font-bold">{utility.title}</h2>
                      <p className="mt-1 text-xs text-slate-500">{utility.subtitle}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      margin >= 0
                        ? "border-blue-100 bg-blue-50 text-blue-700"
                        : "border-red-100 bg-red-50 text-red-700"
                    }`}
                  >
                    {margin >= 0 ? "กำไร" : "ขาดทุน"} {money(Math.abs(margin))}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-500">เรียกเก็บ</p>
                    <strong className="mt-2 block text-lg">{money(utility.billed)}</strong>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-center">
                    <p className="text-xs text-blue-600">รับแล้ว</p>
                    <strong className="mt-2 block text-lg text-blue-700">
                      {money(utility.received)}
                    </strong>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                    <p className="text-xs text-slate-500">จ่ายจริง</p>
                    <strong className="mt-2 block text-lg">{money(utility.paid)}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">สรุปรายรับที่ได้รับแล้ว</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              {[
                ["⌂", "ค่าเช่า", rentReceived],
                ["💧", "ค่าน้ำ", waterReceived],
                ["💡", "ค่าไฟ", electricityReceived],
                ["•••", "รายรับอื่น", otherReceived],
              ].map(([icon, label, value], index) => (
                <div
                  key={String(label)}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${
                    index > 0 ? "border-t border-slate-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-blue-600">{icon}</span>
                    <span className="text-sm text-slate-600">{label}</span>
                  </div>
                  <strong className="text-sm">
                    {money(Number(value))} <span className="font-normal text-slate-400">บาท</span>
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">รายการที่ต้องจัดการ</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["▤", "บิลค้างชำระ", outstandingBills.length, "bg-red-50 text-red-600"],
                ["⌕", "สลิปรอตรวจ", pendingSlips.length, "bg-amber-50 text-amber-600"],
                ["⌂", "ห้องว่าง", vacantRooms.length, "bg-blue-50 text-blue-600"],
                ["↪", "แจ้งย้ายออก", movingOutTenants.length, "bg-slate-100 text-slate-600"],
                ["LINE", "ยังไม่ผูก LINE", unlinkedTenants.length, "bg-emerald-50 text-emerald-600"],
                ["♟", "ห้องมีผู้เช่า", occupiedRooms.length, "bg-blue-50 text-blue-700"],
              ].map(([icon, label, value, color]) => (
                <div key={String(label)} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1 text-xs font-bold ${color}`}>
                      {icon}
                    </span>
                    <strong className="text-lg">{value}</strong>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-end justify-between">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-bold">ห้องพัก</h2>
              <p className="text-xs text-slate-500">
                สถานะและบิลของ {formatPeriod(selectedPeriod)}
              </p>
            </div>
            <span className="text-sm font-semibold text-blue-600">ดูห้องทั้งหมด →</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {rooms.map((room) => {
              const activeTenant = (room.tenants || []).find(
                (tenant) => tenant.is_active
              );
              const currentBill = billsByRoom.get(room.id);
              const movingOut = activeTenant?.planned_move_out_date;

              return (
                <Link
                  key={room.id}
                  href={`/rooms/${room.room_code}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">ห้อง {room.room_code}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {activeTenant?.full_name || "ยังไม่มีผู้เช่า"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        movingOut
                          ? "bg-amber-50 text-amber-700"
                          : room.status === "occupied"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {movingOut
                        ? `ย้ายออก ${formatThaiDate(movingOut)}`
                        : room.status === "occupied"
                          ? "มีผู้เช่า"
                          : "ห้องว่าง"}
                    </span>
                  </div>

                  <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100 text-xs">
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">ผู้พัก</span>
                      <strong>{room.occupant_count} คน</strong>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">บิลเดือนนี้</span>
                      <strong>
                        {currentBill
                          ? `${money(Number(currentBill.total_amount))} บาท`
                          : "ยังไม่ออกบิล"}
                      </strong>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">สถานะบิล</span>
                      <strong
                        className={
                          currentBill?.status === "paid"
                            ? "text-emerald-600"
                            : currentBill
                              ? "text-amber-600"
                              : "text-slate-400"
                        }
                      >
                        {currentBill?.status === "paid"
                          ? "ชำระแล้ว"
                          : currentBill
                            ? "รอดำเนินการ"
                            : "-"}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-blue-200 py-2 text-center text-xs font-semibold text-blue-600 transition group-hover:bg-blue-50">
                    ดูรายละเอียดห้อง　→
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
