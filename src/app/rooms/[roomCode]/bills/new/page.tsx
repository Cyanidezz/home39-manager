import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import { fetchBillingContext } from "@/lib/data/roomPages";
import BillForm from "./BillForm";
import Icon from "@/components/Icon";

type Props = {
  params: Promise<{
    roomCode: string;
  }>;
  /** Prefill from the meter page: the month and the meter reading worked out from its daily usage. */
  searchParams: Promise<{ year?: string; month?: string; meter?: string }>;
};

export default async function NewBillPage({ params, searchParams }: Props) {
  const { roomCode } = await params;
  const query = await searchParams;

  const { supabase } = await requireUser();

  const context = await fetchBillingContext(supabase, roomCode);
  if (!context) notFound();

  const { room, tenant, previousMeter, existingPeriods } = context;

  return (
    <main className="min-h-screen bg-sand-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold">
            <Icon name="receipt" /> ออกบิลใหม่ - ห้อง {room.room_code}
          </h1>

          {/* <p className="mt-1 font-semibold">
            ห้อง {room.room_code}
          </p> */}

          {/* <p className="mt-1 text-sm text-sand-500">
            ผู้เช่า:{" "}
            <strong className="text-sand-800">
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
              previousMeter={previousMeter}
              tenantId={tenant.id}
              tenantName={tenant.full_name}
              tenantHasLine={Boolean(tenant.line_user_id)}
              existingPeriods={existingPeriods}
              rentWaivedYear={tenant.rent_waived_year}
              rentWaivedMonth={tenant.rent_waived_month}
              initialYear={Number.isInteger(Number(query.year)) && query.year ? Number(query.year) : undefined}
              initialMonth={Number.isInteger(Number(query.month)) && query.month ? Number(query.month) : undefined}
              initialMeter={query.meter && Number.isFinite(Number(query.meter)) ? query.meter : undefined}
            />
          )}
        </div>
      </div>
    </main>
  );
}