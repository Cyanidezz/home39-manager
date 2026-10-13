import { formatMoney } from "@/lib/format";
import type { MonthSummary } from "@/lib/dashboard";

export default function SummaryCards({ summary }: { summary: MonthSummary }) {
  const cards = [
    {
      label: "ยอดเรียกเก็บ",
      value: summary.totalIssued,
      detail: `${summary.issuedBills.length} บิล`,
      icon: "▤",
      valueClass: "text-slate-900",
      iconClass: "bg-blue-50 text-blue-600",
    },
    {
      label: "รับเงินจริง",
      value: summary.totalReceived,
      detail: `${summary.paidBills.length} บิลชำระแล้ว`,
      icon: "▣",
      valueClass: "text-emerald-600",
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "ยอดค้างชำระ",
      value: summary.totalOutstanding,
      detail: `${summary.outstandingBills.length} บิลค้าง`,
      icon: "!",
      valueClass: "text-amber-600",
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      label: "รายจ่ายจริง",
      value: summary.totalExpenses,
      detail: `${summary.expenseCount} รายการ`,
      icon: "฿",
      valueClass: "text-red-600",
      iconClass: "bg-red-50 text-red-600",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold text-slate-600">{card.label}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <strong className={`text-2xl tracking-tight ${card.valueClass}`}>
              {formatMoney(card.value)}
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
          {summary.netProfit >= 0 ? "กำไรสุทธิ" : "ขาดทุนสุทธิ"}
        </p>
        <div className="relative mt-3 flex items-center justify-between gap-3">
          <strong className="text-2xl tracking-tight">
            {formatMoney(Math.abs(summary.netProfit))}
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
  );
}
