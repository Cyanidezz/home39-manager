import Link from "next/link";

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
  paid: { text: "ชำระแล้ว", className: "text-green-600" },
  unpaid: { text: "ยังไม่ชำระ", className: "text-red-600" },
  overdue: { text: "เกินกำหนด", className: "text-orange-600" },
  slip_submitted: { text: "ส่งสลิปแล้ว", className: "text-blue-600" },
  verifying: { text: "กำลังตรวจสอบ", className: "text-yellow-600" },
  rejected: { text: "สลิปไม่ผ่าน", className: "text-red-600" },
  draft: { text: "ฉบับร่าง", className: "text-slate-600" },
};

function getBillStatusLabel(status: string) {
  return statusStyles[status] ?? { text: status, className: "text-slate-600" };
}

export default function LatestBillCard({ roomCode, bill }: Props) {
  const status = bill ? getBillStatusLabel(bill.status) : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">⚡ ข้อมูลล่าสุด</h2>

      {bill && status ? (
        <div className="mt-5 space-y-2">
          <p>
            มิเตอร์ไฟล่าสุด <strong>{bill.current_meter ?? "-"}</strong>
          </p>

          <p>
            บิลล่าสุด{" "}
            <strong>
              {bill.billing_month}/{bill.billing_year}
            </strong>
          </p>

          <p>
            ยอด{" "}
            <strong>
              {Number(bill.total_amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              บาท
            </strong>
          </p>

          <p>
            สถานะ <strong className={status.className}>{status.text}</strong>
          </p>

          <Link
            href={`/rooms/${roomCode}/bills`}
            className="mt-5 inline-block rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
          >
            🧾 ดูประวัติบิลทั้งหมด
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-slate-500">ยังไม่มีประวัติบิล</p>

          <Link
            href={`/rooms/${roomCode}/bills/new`}
            className="mt-4 inline-block rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
          >
            🧾 ออกบิลแรก
          </Link>
        </div>
      )}
    </section>
  );
}
