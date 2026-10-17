import { formatMoney } from "@/lib/format";
import type { MonthSummary } from "@/lib/dashboard";
import Icon from "@/components/Icon";

export default function SummaryCards({ summary }: { summary: MonthSummary }) {
  const cards = [
    {
      label: "ยอดเรียกเก็บ",
      value: summary.totalIssued,
      detail: `${summary.issuedBills.length} บิล`,
      icon: <Icon name="receipt" className="h-[18px] w-[18px]" />,
      valueClass: "text-sand-900",
      iconClass: "bg-brand-50 text-brand-600",
    },
    {
      label: "รับเงินจริง",
      value: summary.totalReceived,
      detail: `${summary.paidBills.length} บิลชำระแล้ว`,
      icon: <Icon name="wallet" className="h-[18px] w-[18px]" />,
      valueClass: "text-emerald-600",
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "ยอดค้างชำระ",
      value: summary.totalOutstanding,
      detail: `${summary.outstandingBills.length} บิลค้าง`,
      icon: <Icon name="alert" className="h-[18px] w-[18px]" />,
      valueClass: "text-amber-600",
      iconClass: "bg-amber-50 text-amber-600",
    },
    {
      label: "รายจ่ายจริง",
      value: summary.totalExpenses,
      detail: `${summary.expenseCount} รายการ`,
      icon: <Icon name="baht" className="h-[18px] w-[18px]" />,
      valueClass: "text-red-600",
      iconClass: "bg-red-50 text-red-600",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-sand-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-semibold text-sand-600">{card.label}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <strong className={`text-2xl tracking-tight ${card.valueClass}`}>
              {formatMoney(card.value)}
            </strong>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${card.iconClass}`}>
              {card.icon}
            </span>
          </div>
          <p className="mt-2 text-xs text-sand-400">{card.detail}</p>
        </div>
      ))}

      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 p-4 text-brand-950 shadow-sm">
        <div className="absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-brand-300/40" />
        <div className="absolute bottom-0 right-0 h-12 w-28 -skew-x-12 bg-brand-300/50" />
        <p className="relative text-xs font-semibold text-brand-700">
          {summary.netProfit >= 0 ? "กำไรสุทธิ" : "ขาดทุนสุทธิ"}
        </p>
        <div className="relative mt-3 flex items-center justify-between gap-3">
          <strong className="text-2xl tracking-tight">
            {formatMoney(Math.abs(summary.netProfit))}
          </strong>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-300 bg-white/60 font-bold">
            <Icon name="baht" className="h-[18px] w-[18px]" />
          </span>
        </div>
        <p className="relative mt-2 text-xs text-brand-700">
          เงินรับจริง − รายจ่ายจริง
        </p>
      </div>
    </section>
  );
}
