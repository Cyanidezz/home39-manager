import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatThaiDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${thaiMonths[month - 1]} ${year + 543}`;
}

export default async function RoomsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: rooms, error } = await supabase
    .from("rooms")
    .select(
      "id, room_code, monthly_rent, occupant_count, status, tenants(full_name, phone, planned_move_out_date, is_active)"
    )
    .order("room_code");

  const occupied = (rooms || []).filter((room) => room.status === "occupied").length;
  const vacant = (rooms || []).length - occupied;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">ROOM MANAGEMENT</p>
            <h1 className="mt-2 text-3xl font-bold">ห้องพักทั้งหมด</h1>
            <p className="mt-2 text-slate-500">
              ดูสถานะ ผู้เช่า และข้อมูลค่าเช่าของแต่ละห้อง
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
              มีผู้เช่า <strong className="ml-2 text-blue-700">{occupied}</strong>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
              ห้องว่าง <strong className="ml-2">{vacant}</strong>
            </div>
          </div>
        </div>

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
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
                      🏠
                    </span>
                    <div>
                      <h2 className="text-2xl font-bold">ห้อง {room.room_code}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {tenant?.full_name || "ยังไม่มีผู้เช่า"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      movingOut
                        ? "bg-amber-50 text-amber-700"
                        : vacantRoom
                          ? "bg-slate-100 text-slate-600"
                          : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {movingOut
                      ? `ย้ายออก ${formatThaiDate(movingOut)}`
                      : vacantRoom
                        ? "ห้องว่าง"
                        : "มีผู้เช่า"}
                  </span>
                </div>

                <div className="mt-6 divide-y divide-slate-100 rounded-xl bg-slate-50 px-4">
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-slate-500">ค่าเช่า</span>
                    <strong>
                      {Number(room.monthly_rent).toLocaleString("th-TH")} บาท/เดือน
                    </strong>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-slate-500">จำนวนผู้พัก</span>
                    <strong>{room.occupant_count} คน</strong>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-slate-500">เบอร์โทร</span>
                    <strong>{tenant?.phone || "-"}</strong>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-blue-200 py-2.5 text-center text-sm font-semibold text-blue-600 group-hover:bg-blue-50">
                  ดูและจัดการห้อง →
                </div>
              </Link>
            );
          })}
        </div>

        {!error && (rooms || []).length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            ยังไม่มีข้อมูลห้องพัก
          </div>
        )}
      </div>
    </main>
  );
}
