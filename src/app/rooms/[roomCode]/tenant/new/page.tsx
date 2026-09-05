import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TenantForm from "./TenantForm";

type Props = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function NewTenantPage({ params }: Props) {
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

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">
            เพิ่มข้อมูลผู้เช่า
          </h1>

          <p className="mt-2 text-gray-500">
            ห้อง {room.room_code}
          </p>

          <TenantForm
            roomId={room.id}
            roomCode={room.room_code}
          />
        </div>
      </div>
    </main>
  );
}