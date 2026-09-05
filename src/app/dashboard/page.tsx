import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Home39 Manager
          </h1>

          <p className="mt-1 text-gray-500">
            Dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error.message}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          {rooms?.map((room) => (
            <div
              key={room.id}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <h2 className="text-2xl font-semibold">
                ห้อง {room.room_code}
              </h2>

              <div className="mt-5 space-y-2 text-gray-600">
                <p>
                  ค่าเช่า{" "}
                  <strong>
                    {Number(room.monthly_rent).toLocaleString()}
                  </strong>{" "}
                  บาท
                </p>

                <p>
                  ผู้พัก{" "}
                  <strong>{room.occupant_count}</strong>{" "}
                  คน
                </p>

                <p>
                  สถานะ{" "}
                  <strong>{room.status}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}