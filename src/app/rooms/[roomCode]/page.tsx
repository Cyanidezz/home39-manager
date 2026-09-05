import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function RoomPage({ params }: Props) {
  const { roomCode } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .select(`
      id,
      room_code,
      monthly_rent,
      occupant_count,
      status,
      note
    `)
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (error || !room) {
    notFound();
  }

  const { data: tenants } = await supabase
    .from("tenants")
    .select(`
      id,
      full_name,
      phone,
      email,
      move_in_date,
      move_out_date,
      is_active,
      note
    `)
    .eq("room_id", room.id)
    .eq("is_active", true);

  const { data: bills } = await supabase
    .from("bills")
    .select(`
      id,
      billing_year,
      billing_month,
      total_amount,
      status,
      current_meter
    `)
    .eq("room_id", room.id)
    .order("billing_year", { ascending: false })
    .order("billing_month", { ascending: false })
    .limit(5);

  const latestBill = bills?.[0];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">

        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← กลับ Dashboard
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              ห้อง {room.room_code}
            </h1>

            <p className="mt-1 text-gray-500">
              จัดการข้อมูลห้องพัก
            </p>
          </div>

          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
            {room.status === "occupied"
              ? "มีผู้เช่า"
              : "ว่าง"}
          </span>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              🏠 ข้อมูลห้อง
            </h2>

            <div className="mt-5 space-y-3">
              <p>
                ค่าเช่า{" "}
                <strong>
                  {Number(room.monthly_rent).toLocaleString()} บาท/เดือน
                </strong>
              </p>

              <p>
                จำนวนผู้พัก{" "}
                <strong>{room.occupant_count} คน</strong>
              </p>

              <p>
                ค่าน้ำ{" "}
                <strong>
                  {room.occupant_count} × 150 ={" "}
                  {(room.occupant_count * 150).toLocaleString()} บาท
                </strong>
              </p>

              <p>
                ค่าไฟ <strong>7 บาท/หน่วย</strong>
              </p>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              👤 ผู้เช่า
            </h2>

            <div className="mt-5">
              {tenants && tenants.length > 0 ? (
                tenants.map((tenant) => (
                  <div key={tenant.id}>
                    <p className="text-lg font-medium">
                      {tenant.full_name}
                    </p>

                    <p className="mt-2 text-gray-600">
                      โทร: {tenant.phone || "-"}
                    </p>

                    <p className="text-gray-600">
                      เริ่มเช่า: {tenant.move_in_date || "-"}
                    </p>
                  </div>
                ))
              ) : (
                <div>
                  <p className="text-gray-500">
                    ยังไม่มีข้อมูลผู้เช่า
                  </p>

                  <button className="mt-4 rounded-lg bg-black px-4 py-2 text-white">
                    + เพิ่มข้อมูลผู้เช่า
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              📄 สัญญาเช่า
            </h2>

            <p className="mt-4 text-gray-500">
              ขั้นต่อไปเราจะเชื่อมกับ Storage: contracts
            </p>

            <button className="mt-4 rounded-lg border px-4 py-2">
              Upload สัญญา
            </button>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              ⚡ ข้อมูลล่าสุด
            </h2>

            {latestBill ? (
              <div className="mt-5 space-y-2">
                <p>
                  มิเตอร์ไฟล่าสุด{" "}
                  <strong>
                    {latestBill.current_meter ?? "-"}
                  </strong>
                </p>

                <p>
                  บิลล่าสุด{" "}
                  <strong>
                    {latestBill.billing_month}/
                    {latestBill.billing_year}
                  </strong>
                </p>

                <p>
                  ยอด{" "}
                  <strong>
                    {Number(latestBill.total_amount).toLocaleString()}
                    {" "}บาท
                  </strong>
                </p>

                <p>
                  สถานะ <strong>{latestBill.status}</strong>
                </p>
              </div>
            ) : (
              <p className="mt-4 text-gray-500">
                ยังไม่มีประวัติบิล
              </p>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}