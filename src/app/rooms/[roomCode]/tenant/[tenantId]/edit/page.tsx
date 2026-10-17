import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import { fetchTenantEditContext } from "@/lib/data/roomPages";
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

  const { supabase } = await requireUser();

  const context = await fetchTenantEditContext(supabase, roomCode, tenantId);
  if (!context) notFound();

  const { room, tenant } = context;

  return (
    <main className="min-h-screen bg-sand-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">
            แก้ไขข้อมูลผู้เช่า
          </h1>

          <p className="mt-2 text-sand-500">
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
            <p className="mt-2 text-sm text-sand-500">
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