import Link from "next/link";
import Icon from "@/components/Icon";
import { formatMoney, formatNumber, formatThaiMonth } from "@/lib/format";
import { EmptyNote, InfoCard, InfoRows, secondaryButton } from "./InfoCard";

export type RoomBill = {
  billing_year: number;
  billing_month: number;
  total_amount: number | string | null;
  status: string;
  current_meter: number | string | null;
};

type Props = {
  roomCode: string;
  bill: RoomBill | undefined;
};

const statusStyles: Record<string, { text: string; className: string }> = {
  paid: { text: "ชำระแล้ว", className: "text-green-700" },
  unpaid: { text: "ยังไม่ชำระ", className: "text-red-700" },
  overdue: { text: "เกินกำหนด", className: "text-orange-700" },
  slip_submitted: { text: "ส่งสลิปแล้ว", className: "text-brand-700" },
  verifying: { text: "กำลังตรวจสอบ", className: "text-amber-700" },
  rejected: { text: "สลิปไม่ผ่าน", className: "text-red-700" },
  draft: { text: "ฉบับร่าง", className: "text-sand-600" },
};

function getBillStatusLabel(status: string) {
  return statusStyles[status] ?? { text: status, className: "text-sand-600" };
}

export default function LatestBillCard({ roomCode, bill }: Props) {
  const icon = <Icon name="bolt" className="h-5 w-5" />;

  if (!bill) {
    return (
      <InfoCard
        icon={icon}
        title="ข้อมูลล่าสุด"
        footer={
          <Link href={`/rooms/${roomCode}/bills/new`} className={secondaryButton}>
            <Icon name="receipt" className="h-4 w-4" /> ออกบิลแรก
          </Link>
        }
      >
        <EmptyNote>ยังไม่มีประวัติบิล</EmptyNote>
      </InfoCard>
    );
  }

  const status = getBillStatusLabel(bill.status);

  return (
    <InfoCard
      icon={icon}
      title="ข้อมูลล่าสุด"
      footer={
        <Link href={`/rooms/${roomCode}/bills`} className={secondaryButton}>
          <Icon name="receipt" className="h-4 w-4" /> ดูประวัติบิลทั้งหมด
        </Link>
      }
    >
      <InfoRows
        rows={[
          { label: "มิเตอร์ไฟล่าสุด", value: bill.current_meter != null ? formatNumber(bill.current_meter) : "-" },
          { label: "บิลล่าสุด", value: formatThaiMonth(`${bill.billing_year}-${String(bill.billing_month).padStart(2, "0")}`) },
          { label: "ยอด", value: `${formatMoney(bill.total_amount)} บาท` },
          { label: "สถานะ", value: <span className={status.className}>{status.text}</span> },
        ]}
      />
    </InfoCard>
  );
}
