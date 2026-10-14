import SlipViewer from "../SlipViewer";
import { markBillAsPaid, rejectBillSlip } from "../actions";

type Props = {
  bill: {
    id: string;
    status: string;
    slip_original_name: string | null;
    slip_submitted_at: string | null;
    slip_content_type: string | null;
  };
  roomCode: string;
  slipUrl: string | null;
  slipPreviewUrl: string | null;
};

export default function SlipSection({ bill, roomCode, slipUrl, slipPreviewUrl }: Props) {
  return (
    <section className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-brand-950">หลักฐานการชำระเงิน</h2>
          <p className="mt-1 text-sm text-brand-700">
            {bill.slip_original_name || "ไฟล์สลิป"}
            {bill.slip_submitted_at
              ? ` · ส่งเมื่อ ${new Date(bill.slip_submitted_at).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Bangkok",
                })}`
              : ""}
          </p>
        </div>
        {slipUrl ? (
          <SlipViewer
            slipUrl={slipUrl}
            previewUrl={slipPreviewUrl}
            fileName={bill.slip_original_name || "ไฟล์สลิป"}
            billId={bill.id}
            roomCode={roomCode}
            isPaid={bill.status === "paid"}
            canReject={!['paid', 'rejected'].includes(bill.status)}
            contentType={bill.slip_content_type || ""}
            markBillAsPaid={markBillAsPaid}
            rejectBillSlip={rejectBillSlip}
          />
        ) : (
          <span className="text-sm text-red-700">ไม่สามารถเปิดไฟล์สลิปได้</span>
        )}
      </div>
    </section>
  );
}
