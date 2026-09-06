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
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Home39 Manager</h1>
            <p className="mt-1 text-gray-500">
              ภาพรวมธุรกิจหอพัก · {formatPeriod(selectedPeriod)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <form className="flex items-end gap-2">
              <div>
                <label htmlFor="month" className="mb-1 block text-xs text-gray-500">
                  เดือนที่แสดง
                </label>
                <input
                  id="month"
                  name="month"
                  type="month"
                  defaultValue={selectedPeriod}
                  className="rounded-xl border bg-white px-4 py-3"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border bg-white px-4 py-3 font-medium hover:bg-gray-50"
              >
                ดูข้อมูล
              </button>
            </form>

            <Link
              href={`/expenses?month=${selectedPeriod}`}
              className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-3 font-semibold text-white hover:bg-gray-800"
            >
              + บันทึกรายจ่าย
            </Link>

            <Link
              href="/settings/payment"
              className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-3 font-medium hover:bg-gray-50"
            >
              ⚙️ บัญชีรับโอน
            </Link>
          </div>
        </div>

        {pageError && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            โหลดข้อมูลบางส่วนไม่สำเร็จ: {pageError.message}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">ยอดเรียกเก็บ</p>
            <p className="mt-2 text-2xl font-bold">{money(totalIssued)}</p>
            <p className="mt-1 text-xs text-gray-400">{issuedBills.length} บิล</p>
          </div>
          <div className="rounded-2xl bg-green-50 p-5 shadow-sm">
            <p className="text-sm text-green-700">รับเงินจริง</p>
            <p className="mt-2 text-2xl font-bold text-green-800">
              {money(totalReceived)}
            </p>
            <p className="mt-1 text-xs text-green-600">{paidBills.length} บิลชำระแล้ว</p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-5 shadow-sm">
            <p className="text-sm text-orange-700">ยอดค้างชำระ</p>
            <p className="mt-2 text-2xl font-bold text-orange-800">
              {money(totalOutstanding)}
            </p>
            <p className="mt-1 text-xs text-orange-600">
              {outstandingBills.length} บิลค้าง
            </p>
          </div>
          <div className="rounded-2xl bg-red-50 p-5 shadow-sm">
            <p className="text-sm text-red-700">รายจ่ายจริง</p>
            <p className="mt-2 text-2xl font-bold text-red-800">
              {money(totalExpenses)}
            </p>
            <p className="mt-1 text-xs text-red-600">{expenses.length} รายการ</p>
          </div>
          <div
            className={`rounded-2xl p-5 shadow-sm ${
              netProfit >= 0 ? "bg-blue-50" : "bg-red-100"
            }`}
          >
            <p className={`text-sm ${netProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>
              {netProfit >= 0 ? "กำไรสุทธิ" : "ขาดทุนสุทธิ"}
            </p>
            <p
              className={`mt-2 text-2xl font-bold ${
                netProfit >= 0 ? "text-blue-800" : "text-red-800"
              }`}
            >
              {money(Math.abs(netProfit))}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              เงินรับจริง − รายจ่ายจริง
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">💧 วิเคราะห์ค่าน้ำ</h2>
                <p className="mt-1 text-sm text-gray-500">
                  เปรียบเทียบที่เก็บจากผู้เช่ากับบิลประปาจริง
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  waterReceived - waterPaid >= 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {waterReceived - waterPaid >= 0 ? "กำไร" : "ขาดทุน"}{" "}
                {money(Math.abs(waterReceived - waterPaid))}
              </span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">เรียกเก็บ</p>
                <strong className="mt-1 block">{money(waterBilled)}</strong>
              </div>
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs text-green-700">รับแล้ว</p>
                <strong className="mt-1 block text-green-800">
                  {money(waterReceived)}
                </strong>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-xs text-red-700">จ่ายจริง</p>
                <strong className="mt-1 block text-red-800">{money(waterPaid)}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">⚡ วิเคราะห์ค่าไฟ</h2>
                <p className="mt-1 text-sm text-gray-500">
                  ผู้เช่าใช้รวม {electricityUnits.toLocaleString("th-TH")} หน่วย
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  electricityReceived - electricityPaid >= 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {electricityReceived - electricityPaid >= 0 ? "กำไร" : "ขาดทุน"}{" "}
                {money(Math.abs(electricityReceived - electricityPaid))}
              </span>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">เรียกเก็บ</p>
                <strong className="mt-1 block">{money(electricityBilled)}</strong>
              </div>
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-xs text-green-700">รับแล้ว</p>
                <strong className="mt-1 block text-green-800">
                  {money(electricityReceived)}
                </strong>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-xs text-red-700">จ่ายจริง</p>
                <strong className="mt-1 block text-red-800">
                  {money(electricityPaid)}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">สรุปรายรับที่ได้รับแล้ว</h2>
            <div className="mt-5 space-y-3">
              {[
                ["ค่าเช่า", rentReceived],
                ["ค่าน้ำ", waterReceived],
                ["ค่าไฟ", electricityReceived],
                ["รายรับอื่น", otherReceived],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between border-b pb-3 last:border-0">
                  <span className="text-gray-600">{label}</span>
                  <strong>{money(Number(value))} บาท</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">รายการที่ต้องจัดการ</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["บิลค้างชำระ", outstandingBills.length, "text-orange-700"],
                ["สลิปรอตรวจ", pendingSlips.length, "text-blue-700"],
                ["ห้องว่าง", vacantRooms.length, "text-gray-700"],
                ["แจ้งย้ายออก", movingOutTenants.length, "text-orange-700"],
                ["ยังไม่ผูก LINE", unlinkedTenants.length, "text-red-700"],
                ["ห้องมีผู้เช่า", occupiedRooms.length, "text-green-700"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-xl bg-gray-50 p-4">
                  <strong className={`text-2xl ${color}`}>{value}</strong>
                  <p className="mt-1 text-sm text-gray-600">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">ห้องพัก</h2>
              <p className="mt-1 text-sm text-gray-500">
                สถานะและบิลของ {formatPeriod(selectedPeriod)}
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
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
                  className="block rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-2xl font-semibold">ห้อง {room.room_code}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {activeTenant?.full_name || "ยังไม่มีผู้เช่า"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        movingOut
                          ? "bg-orange-100 text-orange-700"
                          : room.status === "occupied"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {movingOut
                        ? `ย้ายออก ${formatThaiDate(movingOut)}`
                        : room.status === "occupied"
                          ? "มีผู้เช่า"
                          : "ห้องว่าง"}
                    </span>
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>ผู้พัก</span>
                      <strong>{room.occupant_count} คน</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>บิลเดือนนี้</span>
                      <strong>
                        {currentBill ? `${money(Number(currentBill.total_amount))} บาท` : "ยังไม่ออกบิล"}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>สถานะบิล</span>
                      <strong
                        className={
                          currentBill?.status === "paid"
                            ? "text-green-700"
                            : currentBill
                              ? "text-orange-700"
                              : "text-gray-500"
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

                  <div className="mt-5 border-t pt-4 text-sm font-medium">
                    ดูรายละเอียดห้อง →
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
