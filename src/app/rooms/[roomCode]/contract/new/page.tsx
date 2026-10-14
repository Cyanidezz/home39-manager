import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import { fetchContractContext } from "@/lib/data/roomPages";
import ContractForm from "./ContractForm";

type Props = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function NewContractPage({ params }: Props) {
  const { roomCode } = await params;

  const { supabase } = await requireUser();

  const context = await fetchContractContext(supabase, roomCode);
  if (!context) notFound();

  const { room, tenant } = context;

  if (!tenant) {
    return (
      <main className="min-h-screen bg-sand-50 p-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-sand-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            ยังไม่สามารถเพิ่มสัญญาได้
          </h1>

          <p className="mt-3 text-sand-500">
            กรุณาเพิ่มข้อมูลผู้เช่าห้อง {room.room_code} ก่อน
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sand-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">
            📄 เพิ่มสัญญาเช่า
          </h1>

          <p className="mt-2 text-sand-500">
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