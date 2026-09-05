import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditTenantForm from "./EditTenantForm";

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
      room_id
    `)
    .eq("id", tenantId)
    .eq("room_id", room.id)
    .single();

  if (!tenant) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">
            แก้ไขข้อมูลผู้เช่า
          </h1>

          <p className="mt-2 text-gray-500">
            ห้อง {room.room_code}
          </p>

          <EditTenantForm
            tenant={tenant}
            roomId={room.id}
            roomCode={room.room_code}
            occupantCount={room.occupant_count}
          />
        </div>
      </div>
    </main>
  );
}