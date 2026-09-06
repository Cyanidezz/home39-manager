import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContractForm from "./ContractForm";

type Props = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function NewContractPage({ params }: Props) {
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
    .select("id, room_code")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (!room) {
    notFound();
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name")
    .eq("room_id", room.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!tenant) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            ยังไม่สามารถเพิ่มสัญญาได้
          </h1>

          <p className="mt-3 text-slate-500">
            กรุณาเพิ่มข้อมูลผู้เช่าห้อง {room.room_code} ก่อน
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">
            📄 เพิ่มสัญญาเช่า
          </h1>

          <p className="mt-2 text-slate-500">
            ห้อง {room.room_code} • {tenant.full_name}
          </p>

          <ContractForm
            roomId={room.id}
            roomCode={room.room_code}
            tenantId={tenant.id}
          />
        </div>
      </div>
    </main>
  );
}