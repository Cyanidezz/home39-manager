import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import { fetchRoomOverview } from "@/lib/data/room";
import { formatThaiDate } from "@/lib/format";
import RoomInfoCard from "./_components/RoomInfoCard";
import TenantCard from "./_components/TenantCard";
import ContractCard from "./_components/ContractCard";
import LatestBillCard from "./_components/LatestBillCard";
import SettlementCard from "./_components/SettlementCard";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

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

  const { room, tenants, bills, latestContract, contractUrl, lastMovedOut } = overview;
  const activeTenant = tenants[0];
  const latestBill = bills[0];

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        width="5xl"
        back={{ href: "/dashboard", label: "กลับ Dashboard" }}
        title={`ห้อง ${room.room_code}`}
        subtitle="จัดการข้อมูลห้องพัก"
        actions={
          <>
            {activeTenant ? (
              <Link
                href={`/rooms/${room.room_code}/bills/new`}
                className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-medium text-brand-950 hover:bg-brand-400"
              >
                <Icon name="receipt" /> ออกบิลใหม่
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
          </>
        }
      />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        {/* Two independent stacks (no stretched rows), in reading order on mobile: room, tenant, contract, latest bill. */}
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <div className="flex flex-col gap-6">
            <RoomInfoCard room={room} />
            <TenantCard roomCode={room.room_code} tenants={tenants} />
            {lastMovedOut && (
              <SettlementCard
                roomCode={room.room_code}
                tenant={lastMovedOut.tenant}
                settlement={lastMovedOut.settlement}
              />
            )}
          </div>
          <div className="flex flex-col gap-6">
            <ContractCard
              roomCode={room.room_code}
              contract={latestContract}
              contractUrl={contractUrl}
            />
            <LatestBillCard roomCode={room.room_code} bill={latestBill} />
          </div>
        </div>
      </div>
    </main>
  );
}
