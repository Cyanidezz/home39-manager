import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import { fetchSettlementContext } from "@/lib/data/settlement";
import { fetchBillingRates } from "@/lib/data/settings";
import { formatMoney, formatThaiDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import SettlementForm from "./SettlementForm";

type Props = {
  params: Promise<{ roomCode: string; tenantId: string }>;
};

export default async function SettlementPage({ params }: Props) {
  const { roomCode, tenantId } = await params;
  const { supabase } = await requireUser();

  const [context, rates] = await Promise.all([fetchSettlementContext(supabase, roomCode, tenantId), fetchBillingRates(supabase)]);
  if (!context) notFound();

  const { room, tenant, settlement } = context;

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        width="5xl"
        back={{ href: `/rooms/${room.room_code}`, label: `กลับห้อง ${room.room_code}` }}
        title="สรุปเงินมัดจำ"
        subtitle={`ห้อง ${room.room_code} • ${tenant.full_name} • ย้ายออก ${formatThaiDate(tenant.move_out_date)}`}
        actions={
          <span
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              settlement?.status === "closed" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            }`}
          >
            {settlement?.status === "closed" ? "ปิดยอดแล้ว" : "รอสรุป"}
          </span>
        }
      />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
        <p className="text-sm text-sand-500">
          เงินมัดจำ {formatMoney(tenant.deposit_amount)} บาท • ค่าเช่าล่วงหน้า {formatMoney(tenant.advance_rent_amount)} บาท
          ใช้เป็นค่าเช่าเดือนสุดท้ายแล้ว จึงไม่นำมารวมในการหักนี้
        </p>

        <SettlementForm
          tenantId={tenant.id}
          deposit={Number(tenant.deposit_amount ?? 0)}
          previousMeter={context.previousMeter}
          rates={rates}
          lastOccupants={context.lastOccupants}
          outstandingBills={context.outstandingBills.map((bill) => ({
            id: bill.id,
            year: bill.billing_year,
            month: bill.billing_month,
            amount: Number(bill.total_amount),
            status: bill.status,
          }))}
          pendingCheckCount={context.pendingCheckBills.length}
          settlement={
            settlement
              ? {
                  status: settlement.status,
                  finalMeter: settlement.final_electricity_meter,
                  electricity: Number(settlement.electricity_amount),
                  water: Number(settlement.water_amount),
                  items: (settlement.items as { name: string; amount: number }[]) ?? [],
                  note: settlement.note,
                  refund: Number(settlement.refund_amount),
                  outstandingSaved: Number(settlement.outstanding_bills_amount),
                  refundedOn: settlement.refunded_on,
                  reference: settlement.refund_reference,
                  hasSlip: Boolean(settlement.refund_slip_path),
                }
              : null
          }
          slipUrl={context.slipUrl}
        />
      </div>
    </main>
  );
}
