import { formatMoney } from "@/lib/format";
import type { MonthSummary } from "@/lib/dashboard";
import Icon, { type IconName } from "@/components/Icon";

export default function IncomeAndTasks({ summary }: { summary: MonthSummary }) {
  const income: { icon?: IconName; text?: string; label: string; value: number }[] = [
    { icon: "home", label: "ค่าเช่า", value: summary.rentReceived },
    { icon: "droplet", label: "ค่าน้ำ", value: summary.water.received },
    { icon: "bolt", label: "ค่าไฟ", value: summary.electricity.received },
    { text: "•••", label: "รายรับอื่น", value: summary.otherReceived },
  ];

  const tasks: { icon?: IconName; text?: string; label: string; value: number; color: string }[] = [
    { icon: "receipt", label: "บิลค้างชำระ", value: summary.outstandingBills.length, color: "bg-red-50 text-red-600" },
    { icon: "search", label: "สลิปรอตรวจ", value: summary.pendingSlips.length, color: "bg-amber-50 text-amber-600" },
    { icon: "home", label: "ห้องว่าง", value: summary.vacantRooms.length, color: "bg-brand-50 text-brand-600" },
    { icon: "logout", label: "แจ้งย้ายออก", value: summary.movingOutTenants.length, color: "bg-sand-100 text-sand-600" },
    { text: "LINE", label: "ยังไม่ผูก LINE", value: summary.unlinkedTenants.length, color: "bg-emerald-50 text-emerald-600" },
    { icon: "user", label: "ห้องมีผู้เช่า", value: summary.occupiedRooms.length, color: "bg-brand-50 text-brand-700" },
  ];

  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">สรุปรายรับที่ได้รับแล้ว</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-sand-200">
          {income.map(({ icon, text, label, value }, index) => (
            <div
              key={label}
              className={`flex items-center justify-between gap-4 px-4 py-3 ${
                index > 0 ? "border-t border-sand-100" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex w-6 justify-center text-brand-600">
                  {icon ? <Icon name={icon} className="h-4 w-4" /> : text}
                </span>
                <span className="text-sm text-sand-600">{label}</span>
              </div>
              <strong className="text-sm">
                {formatMoney(value)} <span className="font-normal text-sand-400">บาท</span>
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">รายการที่ต้องจัดการ</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tasks.map(({ icon, text, label, value, color }) => (
            <div key={label} className="rounded-lg border border-sand-200 p-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1 text-xs font-bold ${color}`}>
                  {icon ? <Icon name={icon} className="h-4 w-4" /> : text}
                </span>
                <strong className="text-lg">{value}</strong>
              </div>
              <p className="mt-2 text-xs text-sand-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
