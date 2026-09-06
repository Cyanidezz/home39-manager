import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rooms, error } = await supabase
    .from("rooms")
    .select("id, room_code, monthly_rent, occupant_count, status")
    .order("room_code");

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Home39 Manager
            </h1>

            <p className="mt-1 text-gray-500">
              Dashboard
            </p>
          </div>

          <Link
            href="/settings/payment"
            className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-3 font-medium shadow-sm transition hover:bg-gray-50"
          >
            ⚙️ ตั้งค่าบัญชีรับโอน
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error.message}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          {rooms?.map((room) => (
            <Link
                key={room.id}
                href={`/rooms/${room.room_code}`}
                className="block rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
                <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">
                    ห้อง {room.room_code}
                </h2>

                <span className="text-gray-400">→</span>
                </div>

                <div className="mt-5 space-y-2 text-gray-600">
                <p>
                    ค่าเช่า{" "}
                    <strong>
                    {Number(room.monthly_rent).toLocaleString()} บาท
                    </strong>
                </p>

                <p>
                    ผู้พัก <strong>{room.occupant_count} คน</strong>
                </p>

                <p>
                    สถานะ{" "}
                    <strong>
                    {room.status === "occupied" ? "มีผู้เช่า" : "ว่าง"}
                    </strong>
                </p>
                </div>

                <div className="mt-5 border-t pt-4 text-sm font-medium">
                ดูรายละเอียดห้อง →
                </div>
            </Link>
            ))}
        </div>
      </div>
    </main>
  );
}