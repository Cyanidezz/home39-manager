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
      valueClass: "text-emerald-700",
      iconClass: "bg-emerald-50 text-emerald-700",
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

  const loss = summary.netProfit < 0;
  // A loss turns the card red-tinted so it reads as a warning, not just a label.
  const net = loss
    ? { card: "from-red-50 to-red-100 text-red-950", muted: "text-red-800", shapeA: "bg-red-200/50", shapeB: "bg-red-200/60", chip: "border-red-200 bg-white/70" }
    : { card: "from-brand-100 to-brand-200 text-brand-950", muted: "text-brand-700", shapeA: "bg-brand-300/40", shapeB: "bg-brand-300/50", chip: "border-brand-300 bg-white/60" };

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-sand-200 bg-white p-3 shadow-sm sm:p-4"
        >
          <p className="text-xs font-semibold text-sand-600">{card.label}</p>
          <div className="mt-2 flex items-center justify-between gap-3 sm:mt-3">
            <strong className={`text-xl tracking-tight sm:text-2xl ${card.valueClass}`}>
              {formatMoney(card.value)}
            </strong>
            <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold sm:flex ${card.iconClass}`}>
              {card.icon}
            </span>
          </div>
          <p className="mt-2 text-xs text-sand-500">{card.detail}</p>
        </div>
      ))}

      <div className={`relative col-span-2 overflow-hidden rounded-xl bg-gradient-to-br p-4 shadow-sm lg:col-span-1 ${net.card}`}>
        <div className={`absolute -bottom-8 -right-6 h-24 w-24 rounded-full ${net.shapeA}`} />
        <div className={`absolute bottom-0 right-0 h-12 w-28 -skew-x-12 ${net.shapeB}`} />
        <p className={`relative text-xs font-semibold ${net.muted}`}>
          {loss ? "ขาดทุนสุทธิ" : "กำไรสุทธิ"}
        </p>
        <div className="relative mt-3 flex items-center justify-between gap-3">
          <strong className="text-2xl tracking-tight">
            {formatMoney(Math.abs(summary.netProfit))}
          </strong>
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border font-bold ${net.chip}`}>
            <Icon name="baht" className="h-[18px] w-[18px]" />
          </span>
        </div>
        <p className={`relative mt-2 text-xs ${net.muted}`}>
          เงินรับจริง − รายจ่ายจริง
        </p>
      </div>
    </section>
  );
}
