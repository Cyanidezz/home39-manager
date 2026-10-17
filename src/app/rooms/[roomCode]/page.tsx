import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import { fetchRoomOverview } from "@/lib/data/room";
import { formatThaiDate } from "@/lib/format";
import RoomInfoCard from "./_components/RoomInfoCard";
import TenantCard from "./_components/TenantCard";
import ContractCard from "./_components/ContractCard";
import LatestBillCard from "./_components/LatestBillCard";

type Props = {
  params: Promise<{
    roomCode: string;
  }>;
};

export default async function RoomPage({ params }: Props) {
  const { roomCode } = await params;

  const { supabase } = await requireUser();

  const overview = await fetchRoomOverview(supabase, roomCode);
  if (!overview) notFound();

  const { room, tenants, bills, latestContract, contractUrl } = overview;
  const activeTenant = tenants[0];
  const latestBill = bills[0];

  return (
    <main className="min-h-screen bg-sand-50 p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="text-sm text-sand-500 hover:text-brand-700"
        >
          ← กลับ Dashboard
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              ห้อง {room.room_code}
            </h1>

            <p className="mt-1 text-sand-500">
              จัดการข้อมูลห้องพัก
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeTenant ? (
              <Link
                href={`/rooms/${room.room_code}/bills/new`}
                className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-brand-950 hover:bg-brand-400"
              >
                🧾 ออกบิลใหม่
              </Link>
            ) : (
              <Link
                href={`/rooms/${room.room_code}/tenant/new`}
                className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-brand-950 hover:bg-brand-400"
              >
                + สร้างผู้เช่าใหม่
              </Link>
            )}

            <span className={`rounded-full px-4 py-2 text-sm font-medium ${
              activeTenant?.planned_move_out_date
                ? "bg-orange-100 text-orange-700"
                : room.status === "occupied"
                  ? "bg-green-100 text-green-700"
                  : "bg-sand-100 text-sand-700"
            }`}>
              {activeTenant?.planned_move_out_date
                ? `ผู้เช่าแจ้งย้ายออก ${formatThaiDate(activeTenant.planned_move_out_date)}`
                : room.status === "occupied" ? "มีผู้เช่า" : "ไม่มีผู้เช่า"}
            </span>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <RoomInfoCard room={room} />
          <TenantCard roomCode={room.room_code} tenants={tenants} />
          <ContractCard
            roomCode={room.room_code}
            contract={latestContract}
            contractUrl={contractUrl}
          />
          <LatestBillCard roomCode={room.room_code} bill={latestBill} />
        </div>
      </div>
    </main>
  );
}
