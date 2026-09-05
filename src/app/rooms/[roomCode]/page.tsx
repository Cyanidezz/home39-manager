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

  const { data: contracts } = await supabase
    .from("contracts")
    .select(`
      id,
      contract_start,
      contract_end,
      deposit_amount,
      file_path,
      original_file_name,
      note,
      created_at
    `)
    .eq("room_id", room.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestContract = contracts?.[0];

  let contractUrl: string | null = null;

  if (latestContract?.file_path) {
    const { data } = await supabase.storage
      .from("contracts")
      .createSignedUrl(latestContract.file_path, 60 * 10);

    contractUrl = data?.signedUrl ?? null;
  }

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
                    <p className="text-lg font-medium">{tenant.full_name}</p>

                    <p className="mt-2 text-gray-600">
                        โทร: {tenant.phone || "-"}
                    </p>

                    <p className="text-gray-600">
                        เริ่มเช่า: {tenant.move_in_date || "-"}
                    </p>

                    <Link
                        href={`/rooms/${room.room_code}/tenant/${tenant.id}/edit`}
                        className="mt-4 inline-block rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                    >
                        ✏️ แก้ไขข้อมูลผู้เช่า
                    </Link>
                    </div>
                ))
                ) : (
                <div>
                  <p className="text-gray-500">
                    ยังไม่มีข้อมูลผู้เช่า
                  </p>
                    <Link
                    href={`/rooms/${room.room_code}/tenant/new`}
                    className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-white"
                    >
                    + เพิ่มข้อมูลผู้เช่า
                    </Link>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              📄 สัญญาเช่า
            </h2>

            {latestContract ? (
              <div className="mt-5">
                <p className="font-medium">
                  {latestContract.original_file_name || "สัญญาเช่า"}
                </p>

                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>
                    เริ่มสัญญา: {latestContract.contract_start || "-"}
                  </p>

                  <p>
                    สิ้นสุดสัญญา: {latestContract.contract_end || "-"}
                  </p>

                  <p>
                    เงินประกัน:{" "}
                    {latestContract.deposit_amount != null
                      ? `${Number(
                          latestContract.deposit_amount
                        ).toLocaleString()} บาท`
                      : "-"}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {contractUrl && (
                    <a
                      href={contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-black px-4 py-2 text-sm text-white"
                    >
                      👁 ดูสัญญา
                    </a>
                  )}

                  <Link
                    href={`/rooms/${room.room_code}/contract/new`}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    ⬆ Upload สัญญาใหม่
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-gray-500">
                  ยังไม่มีสัญญาเช่า
                </p>

                <Link
                  href={`/rooms/${room.room_code}/contract/new`}
                  className="mt-4 inline-block rounded-lg border px-4 py-2 hover:bg-gray-50"
                >
                  ⬆ Upload สัญญา
                </Link>
              </div>
            )}
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