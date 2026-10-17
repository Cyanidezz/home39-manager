import Link from "next/link";
import { formatMoney, formatThaiDate, formatThaiMonth } from "@/lib/format";
import type { DashboardRoom, MonthSummary } from "@/lib/dashboard";

type Props = {
  rooms: DashboardRoom[];
  billsByRoom: MonthSummary["billsByRoom"];
  period: string;
};

export default function RoomGrid({ rooms, billsByRoom, period }: Props) {
  return (
    <section className="mt-6">
      <div className="mb-4 flex items-end justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-bold">ห้องพัก</h2>
          <p className="text-xs text-sand-500">
            สถานะและบิลของ {formatThaiMonth(period)}
          </p>
        </div>
        <span className="text-sm font-semibold text-brand-600">ดูห้องทั้งหมด →</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {rooms.map((room) => {
          const activeTenant = (room.tenants || []).find((tenant) => tenant.is_active);
          const currentBill = billsByRoom.get(room.id);
          const movingOut = activeTenant?.planned_move_out_date;

          return (
            <Link
              key={room.id}
              href={`/rooms/${room.room_code}`}
              className="group rounded-xl border border-sand-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">ห้อง {room.room_code}</h3>
                  <p className="mt-1 text-xs text-sand-500">
                    {activeTenant?.full_name || "ยังไม่มีผู้เช่า"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    movingOut
                      ? "bg-amber-50 text-amber-700"
                      : room.status === "occupied"
                        ? "bg-brand-50 text-brand-700"
                        : "bg-sand-100 text-sand-600"
                  }`}
                >
                  {movingOut
                    ? `ย้ายออก ${formatThaiDate(movingOut)}`
                    : room.status === "occupied"
                      ? "มีผู้เช่า"
                      : "ห้องว่าง"}
                </span>
              </div>

              <div className="mt-4 divide-y divide-sand-100 border-y border-sand-100 text-xs">
                <div className="flex justify-between py-2">
                  <span className="text-sand-500">ผู้พัก</span>
                  <strong>{room.occupant_count} คน</strong>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sand-500">บิลเดือนนี้</span>
                  <strong>
                    {currentBill
                      ? `${formatMoney(currentBill.total_amount)} บาท`
                      : "ยังไม่ออกบิล"}
                  </strong>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sand-500">สถานะบิล</span>
                  <strong
                    className={
                      currentBill?.status === "paid"
                        ? "text-emerald-600"
                        : currentBill
                          ? "text-amber-600"
                          : "text-sand-400"
                    }
                  >
                    {currentBill?.status === "paid"
                      ? "ชำระแล้ว"
                      : currentBill
                        ? "รอดำเนินการ"
                        : "-"}
                  </strong>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-brand-200 py-2 text-center text-xs font-semibold text-brand-600 transition group-hover:bg-brand-50">
                ดูรายละเอียดห้อง　→
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
