import { requireUser } from "@/lib/data/session";
import SlipNotificationBell from "@/components/SlipNotificationBell";
import { formatThaiMonth, parsePeriod } from "@/lib/format";
import { summarizeMonth } from "@/lib/dashboard";
import { fetchMonthData } from "@/lib/data/dashboard";
import SummaryCards from "./_components/SummaryCards";
import UtilityCards from "./_components/UtilityCards";
import IncomeAndTasks from "./_components/IncomeAndTasks";
import RoomGrid from "./_components/RoomGrid";

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { supabase } = await requireUser();

  const query = await searchParams;
  const { period: selectedPeriod, year, month } = parsePeriod(query.month);

  const { rooms, bills, expenses, error: pageError } = await fetchMonthData(
    supabase,
    year,
    month
  );
  const summary = summarizeMonth(rooms, bills, expenses);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              ภาพรวมประจำเดือน
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              รายรับ รายจ่าย และสถานะห้องพัก · {formatThaiMonth(selectedPeriod)}
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
            <SlipNotificationBell />
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
        {pageError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            โหลดข้อมูลบางส่วนไม่สำเร็จ: {pageError.message}
          </div>
        )}

        <SummaryCards summary={summary} />
        <UtilityCards summary={summary} />
        <IncomeAndTasks summary={summary} />
        <RoomGrid
          rooms={rooms}
          billsByRoom={summary.billsByRoom}
          period={selectedPeriod}
        />
      </div>
    </main>
  );
}
