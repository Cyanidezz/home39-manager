import { formatMoney } from "@/lib/format";
import type { MonthSummary } from "@/lib/dashboard";

export default function IncomeAndTasks({ summary }: { summary: MonthSummary }) {
  const income = [
    ["⌂", "ค่าเช่า", summary.rentReceived],
    ["💧", "ค่าน้ำ", summary.water.received],
    ["💡", "ค่าไฟ", summary.electricity.received],
    ["•••", "รายรับอื่น", summary.otherReceived],
  ] as const;

  const tasks = [
    ["▤", "บิลค้างชำระ", summary.outstandingBills.length, "bg-red-50 text-red-600"],
    ["⌕", "สลิปรอตรวจ", summary.pendingSlips.length, "bg-amber-50 text-amber-600"],
    ["⌂", "ห้องว่าง", summary.vacantRooms.length, "bg-brand-50 text-brand-600"],
    ["↪", "แจ้งย้ายออก", summary.movingOutTenants.length, "bg-sand-100 text-sand-600"],
    ["LINE", "ยังไม่ผูก LINE", summary.unlinkedTenants.length, "bg-emerald-50 text-emerald-600"],
    ["♟", "ห้องมีผู้เช่า", summary.occupiedRooms.length, "bg-brand-50 text-brand-700"],
  ] as const;

  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">สรุปรายรับที่ได้รับแล้ว</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-sand-200">
          {income.map(([icon, label, value], index) => (
            <div
              key={label}
              className={`flex items-center justify-between gap-4 px-4 py-3 ${
                index > 0 ? "border-t border-sand-100" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-brand-600">{icon}</span>
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
          {tasks.map(([icon, label, value, color]) => (
            <div key={label} className="rounded-lg border border-sand-200 p-3">
              <div className="flex items-center gap-2">
                <span className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1 text-xs font-bold ${color}`}>
                  {icon}
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
