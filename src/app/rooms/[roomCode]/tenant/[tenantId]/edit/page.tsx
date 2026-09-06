import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LineConnectionCard from "@/components/LineConnectionCard";
import EditTenantForm from "./EditTenantForm";
import EndTenancyButton from "./EndTenancyButton";

type Props = {
  params: Promise<{
    roomCode: string;
    tenantId: string;
  }>;
};

export default async function EditTenantPage({ params }: Props) {
  const { roomCode, tenantId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code, occupant_count")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (!room) {
    notFound();
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select(`
      id,
      full_name,
      phone,
      move_in_date,
      note,
      room_id,
      line_user_id,
      termination_notice_date,
      planned_move_out_date
    `)
    .eq("id", tenantId)
    .eq("room_id", room.id)
    .single();

  if (!tenant) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">
            แก้ไขข้อมูลผู้เช่า
          </h1>

          <p className="mt-2 text-slate-500">
            ห้อง {room.room_code}
          </p>

          <EditTenantForm
            tenant={tenant}
            roomId={room.id}
            roomCode={room.room_code}
            occupantCount={room.occupant_count}
          />

          <div className="mt-8 border-t pt-8">
            <h2 className="text-xl font-semibold">ผูกบัญชี LINE</h2>
            <LineConnectionCard
              tenantId={tenant.id}
              linked={Boolean(tenant.line_user_id)}
            />
          </div>

          <div className="mt-8 border-t pt-8">
            <h2 className="text-xl font-semibold">การสิ้นสุดสัญญาเช่า</h2>
            <p className="mt-2 text-sm text-slate-500">
              บันทึกวันที่แจ้งและวันที่จะย้ายออก โดยต้องแจ้งล่วงหน้าอย่างน้อย 1 เดือน
            </p>
            <EndTenancyButton
              tenantId={tenant.id}
              tenantName={tenant.full_name}
              initialNoticeDate={tenant.termination_notice_date}
              initialMoveOutDate={tenant.planned_move_out_date}
            />
          </div>
        </div>
      </div>
    </main>
  );
}