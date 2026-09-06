import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BillForm from "./BillForm";

type Props = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function NewBillPage({ params }: Props) {
  const { roomCode } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: room } = await supabase
    .from("rooms")
    .select(`
      id,
      room_code,
      monthly_rent,
      occupant_count
    `)
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (!room) {
    notFound();
  }

  // ดึงผู้เช่าปัจจุบันของห้อง
  const { data: tenant } = await supabase
    .from("tenants")
    .select(`
      id,
      full_name,
      rent_waived_year,
      rent_waived_month,
      initial_electricity_meter
    `)
    .eq("room_id", room.id)
    .eq("is_active", true)
    .maybeSingle();

  // ดึงบิลล่าสุดเพื่อใช้มิเตอร์ครั้งก่อน
  const { data: latestBill } = await supabase
    .from("bills")
    .select(`
      billing_year,
      billing_month,
      current_meter
    `)
    .eq("room_id", room.id)
    .not("current_meter", "is", null)
    .order("billing_year", { ascending: false })
    .order("billing_month", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">
            🧾 ออกบิลใหม่ - ห้อง {room.room_code}
          </h1>

          {/* <p className="mt-1 font-semibold">
            ห้อง {room.room_code}
          </p> */}

          {/* <p className="mt-1 text-sm text-slate-500">
            ผู้เช่า:{" "}
            <strong className="text-slate-800">
              {tenant?.full_name || "ไม่พบผู้เช่าปัจจุบัน"}
            </strong>
          </p> */}

          {!tenant ? (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              ไม่สามารถออกบิลได้ เนื่องจากห้องนี้ไม่มีผู้เช่าปัจจุบัน
            </div>
          ) : (
            <BillForm
              roomId={room.id}
              roomCode={room.room_code}
              monthlyRent={Number(room.monthly_rent)}
              occupantCount={room.occupant_count}
              previousMeter={
                latestBill?.current_meter != null
                  ? Number(latestBill.current_meter)
                  : tenant.initial_electricity_meter != null
                    ? Number(tenant.initial_electricity_meter)
                    : null
              }
              tenantId={tenant.id}
              tenantName={tenant.full_name}
              rentWaivedYear={tenant.rent_waived_year}
              rentWaivedMonth={tenant.rent_waived_month}
            />
          )}
        </div>
      </div>
    </main>
  );
}