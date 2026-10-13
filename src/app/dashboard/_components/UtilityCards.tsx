import { formatMoney } from "@/lib/format";
import type { MonthSummary } from "@/lib/dashboard";

export default function UtilityCards({ summary }: { summary: MonthSummary }) {
  const utilities = [
    {
      title: "วิเคราะห์ค่าน้ำ",
      subtitle: "เปรียบเทียบยอดเรียกเก็บกับต้นทุนจริง",
      icon: "💧",
      ...summary.water,
    },
    {
      title: "วิเคราะห์ค่าไฟ",
      subtitle: `ผู้เช่าใช้รวม ${summary.electricity.units.toLocaleString("th-TH")} หน่วย`,
      icon: "💡",
      ...summary.electricity,
    },
  ];

  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-2">
      {utilities.map((utility) => {
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
                {margin >= 0 ? "กำไร" : "ขาดทุน"} {formatMoney(Math.abs(margin))}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500">เรียกเก็บ</p>
                <strong className="mt-2 block text-lg">{formatMoney(utility.billed)}</strong>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-center">
                <p className="text-xs text-blue-600">รับแล้ว</p>
                <strong className="mt-2 block text-lg text-blue-700">
                  {formatMoney(utility.received)}
                </strong>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                <p className="text-xs text-slate-500">จ่ายจริง</p>
                <strong className="mt-2 block text-lg">{formatMoney(utility.paid)}</strong>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
