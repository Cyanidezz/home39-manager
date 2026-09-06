import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExpenseManager from "./ExpenseManager";

type Props = {
  searchParams: Promise<{ month?: string }>;
};

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export default async function ExpensesPage({ searchParams }: Props) {
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

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("id, expense_date, category, amount, billing_year, billing_month, note")
    .eq("billing_year", year)
    .eq("billing_month", month)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={`/dashboard?month=${selectedPeriod}`}
              className="text-sm text-gray-500 hover:text-black"
            >
              ← กลับ Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold">รายจ่ายจริง</h1>
            <p className="mt-1 text-gray-500">
              บันทึกค่าใช้จ่ายเพื่อนำไปคำนวณกำไร/ขาดทุน
            </p>
          </div>

          <form className="flex items-end gap-3">
            <div>
              <label htmlFor="month" className="mb-1 block text-sm text-gray-500">
                เดือนบัญชี
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
              ดูเดือนนี้
            </button>
          </form>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            โหลดรายจ่ายไม่สำเร็จ: {error.message}
          </div>
        )}

        <ExpenseManager
          initialExpenses={expenses || []}
          selectedPeriod={selectedPeriod}
        />
      </div>
    </main>
  );
}
