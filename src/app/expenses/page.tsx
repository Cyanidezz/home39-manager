import { requireUser } from "@/lib/data/session";
import { fetchMonthExpenses } from "@/lib/data/lists";
import { parsePeriod } from "@/lib/format";
import ExpenseManager from "./ExpenseManager";
import PageHeader from "@/components/PageHeader";

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const { supabase } = await requireUser();

  const query = await searchParams;
  const { period: selectedPeriod, year, month } = parsePeriod(query.month);

  const { data: expenses, error } = await fetchMonthExpenses(supabase, year, month);

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        back={{ href: `/dashboard?month=${selectedPeriod}`, label: "กลับ Dashboard" }}
        title="รายจ่ายจริง"
        subtitle="บันทึกค่าใช้จ่ายเพื่อนำไปคำนวณกำไร/ขาดทุน"
        actions={
          <form className="flex items-end gap-3">
            <div>
              <label htmlFor="month" className="mb-1 block text-xs text-sand-500">
                เดือนที่แสดงรายการ
              </label>
              <input
                id="month"
                name="month"
                type="month"
                defaultValue={selectedPeriod}
                className="rounded-xl border border-sand-200 bg-white px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl border border-brand-200 bg-white px-4 py-2.5 font-semibold text-brand-700 hover:bg-brand-50"
            >
              ดูเดือนนี้
            </button>
          </form>
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
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
