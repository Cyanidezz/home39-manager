import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import StatusEditor from "./StatusEditor";
import BillBreakdown from "./_components/BillBreakdown";
import SlipSection from "./_components/SlipSection";
import { updateBillStatus } from "./actions";
import SendBillLineButton from "@/components/SendBillLineButton";
import { getBillStatus } from "@/lib/billStatus";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";

type Props = {
  params: Promise<{
    roomCode: string;
    billId: string;
  }>;
  searchParams: Promise<{ lineSend?: string }>;
};

export default async function BillDetailPage({ params, searchParams }: Props) {
  const { roomCode, billId } = await params;
  const { lineSend } = await searchParams;
  const { supabase } = await requireUser();

  const { data: bill, error } = await supabase
    .from("bills")
    .select(`
      *,
      rooms (
        room_code
      ),
      tenants (
        full_name
      ),
      bill_items (
        id,
        item_name,
        amount,
        created_at,
        position
      )
    `)
    .eq("id", billId)
    .single();

  if (error || !bill || bill.rooms?.room_code !== roomCode) {
    notFound();
  }

  const status = getBillStatus(bill.status);
  let slipUrl: string | null = null;
  let slipPreviewUrl: string | null = null;

  if (bill.slip_path) {
    const { data: slipData } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(bill.slip_path, 60 * 10);
    slipUrl = slipData?.signedUrl ?? null;
  }

  if (bill.slip_preview_path) {
    const { data: previewData } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(bill.slip_preview_path, 60 * 10);
    slipPreviewUrl = previewData?.signedUrl ?? null;
  }

  const billItems = [...(bill.bill_items || [])].sort(
    (a, b) =>
      a.position - b.position ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        width="3xl"
        back={{ href: `/rooms/${bill.rooms.room_code}/bills`, label: "กลับประวัติบิล" }}
        title={<><Icon name="receipt" /> รายละเอียดบิล</>}
        subtitle={
          <>
            <p>ห้อง {bill.rooms.room_code}</p>
            <p>
              ผู้เช่า:{" "}
              <span className="font-medium text-sand-900">
                {bill.tenants?.full_name || "-"}
              </span>
            </p>
          </>
        }
        actions={
          <>
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${status.className}`}
            >
              {status.text}
            </span>
            <StatusEditor
              billId={bill.id}
              roomCode={bill.rooms.room_code}
              currentStatus={bill.status}
              updateBillStatus={updateBillStatus}
            />
          </>
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        {lineSend === "sent" && (
          <p role="status" className="mb-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">
            ออกบิลและส่งทาง LINE ให้ผู้เช่าแล้ว
          </p>
        )}
        {lineSend === "failed" && (
          <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            ออกบิลแล้ว แต่ส่งทาง LINE ไม่สำเร็จ ผู้เช่ายังไม่ได้รับบิล กรุณากด &quot;ส่งบิลทาง LINE&quot; ด้านล่างเพื่อลองใหม่
          </p>
        )}

        <BillBreakdown bill={bill} items={billItems} />

        {bill.slip_path && (
          <SlipSection
            bill={bill}
            roomCode={bill.rooms.room_code}
            slipUrl={slipUrl}
            slipPreviewUrl={slipPreviewUrl}
          />
        )}

        <div className="mt-6 flex flex-wrap items-start justify-end gap-3">
          <SendBillLineButton billId={bill.id} />
          <Link
            href={`/rooms/${bill.rooms.room_code}/bills/${bill.id}/edit`}
            className="rounded-xl border border-sand-300 bg-white px-5 py-3 font-medium text-sand-700 hover:bg-sand-50"
          >
            แก้ไขข้อมูลบิล
          </Link>

          <Link
            href={`/pay/${bill.public_token}`}
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
            className="rounded-xl border border-sand-300 bg-white px-5 py-3 font-medium text-sand-700 hover:bg-sand-50"
          >
            <Icon name="eye" /> ดูบิลสำหรับผู้เช่า
          </Link>

        </div>

        {bill.status === "paid" && bill.paid_at && (
          <p className="mt-4 text-right text-sm text-sand-500">
            ชำระเมื่อ:{" "}
            {new Date(bill.paid_at).toLocaleString("th-TH", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Bangkok",
            })}
          </p>
        )}
      </div>
    </main>
  );
}

