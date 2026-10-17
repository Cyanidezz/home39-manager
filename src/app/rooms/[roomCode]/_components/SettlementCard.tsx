import Link from "next/link";
import Icon from "@/components/Icon";
import { formatMoney, formatThaiDate } from "@/lib/format";
import { settlementState } from "@/lib/settlement";
import { EmptyNote, InfoCard, InfoRows, primaryButton, secondaryButton } from "./InfoCard";

type Props = {
  roomCode: string;
  tenant: { id: string; full_name: string; move_out_date: string | null; deposit_amount: number | string | null };
  settlement: { status: string; refund_amount: number | string; refunded_on: string | null } | null;
};

/** The tenant who just moved out and what is left to do with their deposit. */
export default function SettlementCard({ roomCode, tenant, settlement }: Props) {
  const state = settlementState(settlement);
  const refund = Number(settlement?.refund_amount ?? 0);
  const href = `/rooms/${roomCode}/settlement/${tenant.id}`;

  // A settled tenant is only history: keep the card quiet and out of the way of the next tenant.
  const headline =
    state === "closed"
      ? refund > 0
        ? `คืนมัดจำแล้ว ${formatMoney(refund)} บาท`
        : refund < 0
          ? `ปิดยอดแล้ว ผู้เช่ายังค้าง ${formatMoney(-refund)} บาท`
          : "ปิดยอดแล้ว ไม่มีเงินต้องคืน"
      : state === "open"
        ? "บันทึกใบสรุปแล้ว รอโอนคืน/ปิดยอด"
        : "ยังไม่ได้สรุปเงินมัดจำ";

  return (
    <InfoCard
      icon={<Icon name="receipt" className="h-5 w-5" />}
      title="สรุปเงินมัดจำผู้เช่าเดิม"
      footer={
        <Link href={href} className={state === "closed" ? secondaryButton : primaryButton}>
          {state === "closed" ? "ดูใบสรุป" : state === "open" ? "ทำต่อ" : "เริ่มสรุปมัดจำ"}
        </Link>
      }
    >
      <p className={`mb-3 text-sm font-semibold ${state === "closed" ? "text-green-700" : "text-orange-700"}`}>{headline}</p>
      <InfoRows
        rows={[
          { label: "ผู้เช่าเดิม", value: tenant.full_name },
          { label: "ย้ายออก", value: formatThaiDate(tenant.move_out_date) },
          { label: "เงินมัดจำ", value: `${formatMoney(tenant.deposit_amount)} บาท` },
          ...(settlement?.refunded_on ? [{ label: "โอนคืนเมื่อ", value: formatThaiDate(settlement.refunded_on) }] : []),
        ]}
      />
      {state === "none" && (
        <div className="mt-3">
          <EmptyNote>ตรวจห้อง ประเมินความเสียหาย และค่าน้ำไฟ แล้วหักจากเงินมัดจำก่อนโอนคืน</EmptyNote>
        </div>
      )}
    </InfoCard>
  );
}
