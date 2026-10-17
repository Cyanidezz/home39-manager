import Link from "next/link";
import { requireUser } from "@/lib/data/session";
import { fetchRoomList } from "@/lib/data/lists";
import { formatThaiDate } from "@/lib/format";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

export default async function RoomsPage() {
  const { supabase } = await requireUser("/");

  const { data: rooms, error } = await fetchRoomList(supabase);

  const occupied = (rooms || []).filter((room) => room.status === "occupied").length;
  const vacant = (rooms || []).length - occupied;

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        eyebrow="Room management"
        title="ห้องพักทั้งหมด"
        subtitle="ดูสถานะ ผู้เช่า และข้อมูลค่าเช่าของแต่ละห้อง"
        actions={
          <>
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-2 text-sm">
              มีผู้เช่า <strong className="ml-2 text-brand-700">{occupied}</strong>
            </div>
            <div className="rounded-xl border border-sand-200 bg-white px-4 py-2 text-sm">
              ห้องว่าง <strong className="ml-2">{vacant}</strong>
            </div>
          </>
        }
      />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            โหลดข้อมูลห้องไม่สำเร็จ: {error.message}
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(rooms || []).map((room) => {
            const tenant = (room.tenants || []).find((item) => item.is_active);
            const movingOut = tenant?.planned_move_out_date;
            const vacantRoom = room.status !== "occupied";

            return (
              <Link
                key={room.id}
                href={`/rooms/${room.room_code}`}
                className="group rounded-2xl border border-sand-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:border-brand-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-xl">
                      <Icon name="home" className="h-6 w-6 text-brand-600" />
                    </span>
                    <div>
                      <h2 className="text-2xl font-bold">ห้อง {room.room_code}</h2>
                      <p className="mt-1 text-sm text-sand-500">
                        {tenant?.full_name || "ยังไม่มีผู้เช่า"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      movingOut
                        ? "bg-amber-50 text-amber-700"
                        : vacantRoom
                          ? "bg-sand-100 text-sand-600"
                          : "bg-brand-50 text-brand-700"
                    }`}
                  >
                    {movingOut
                      ? `ย้ายออก ${formatThaiDate(movingOut)}`
                      : vacantRoom
                        ? "ห้องว่าง"
                        : "มีผู้เช่า"}
                  </span>
                </div>

                <div className="mt-6 divide-y divide-sand-100 rounded-xl bg-sand-50 px-4">
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-sand-500">ค่าเช่า</span>
                    <strong>
                      {Number(room.monthly_rent).toLocaleString("th-TH")} บาท/เดือน
                    </strong>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-sand-500">จำนวนผู้พัก</span>
                    <strong>{room.occupant_count} คน</strong>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-sand-500">เบอร์โทร</span>
                    <strong>{tenant?.phone || "-"}</strong>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-brand-200 py-2.5 text-center text-sm font-semibold text-brand-600 group-hover:bg-brand-50">
                  ดูและจัดการห้อง →
                </div>
              </Link>
            );
          })}
        </div>

        {!error && (rooms || []).length === 0 && (
          <div className="mt-8 rounded-2xl border border-sand-200 bg-white p-10 text-center text-sand-500">
            ยังไม่มีข้อมูลห้องพัก
          </div>
        )}
      </div>
    </main>
  );
}
