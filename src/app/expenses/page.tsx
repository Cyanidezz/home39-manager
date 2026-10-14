import Link from "next/link";
import { requireUser } from "@/lib/data/session";
import { fetchMonthExpenses } from "@/lib/data/lists";
import { parsePeriod } from "@/lib/format";
import ExpenseManager from "./ExpenseManager";

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const { supabase } = await requireUser();

  const query = await searchParams;
  const { period: selectedPeriod, year, month } = parsePeriod(query.month);

  const { data: expenses, error } = await fetchMonthExpenses(supabase, year, month);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={`/dashboard?month=${selectedPeriod}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← กลับ Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold">รายจ่ายจริง</h1>
            <p className="mt-1 text-slate-500">
              บันทึกค่าใช้จ่ายเพื่อนำไปคำนวณกำไร/ขาดทุน
            </p>
          </div>

          <form className="flex items-end gap-3">
            <div>
              <label htmlFor="month" className="mb-1 block text-sm text-slate-500">
                เดือนบัญชี
              </label>
              <input
                id="month"
                name="month"
                type="month"
                defaultValue={selectedPeriod}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl border border-blue-200 bg-white px-4 py-3 font-semibold text-blue-700 hover:bg-blue-50"
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
