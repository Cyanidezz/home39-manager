import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatusEditor from "./StatusEditor";
import BillBreakdown from "./_components/BillBreakdown";
import SlipSection from "./_components/SlipSection";
import { updateBillStatus } from "./actions";
import SendBillLineButton from "@/components/SendBillLineButton";
import { getBillStatus } from "@/lib/billStatus";

type Props = {
  params: Promise<{
    roomCode: string;
    billId: string;
  }>;
};

export default async function BillDetailPage({ params }: Props) {
  const { roomCode, billId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
        created_at
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
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/rooms/${bill.rooms.room_code}/bills`}
          className="text-sm text-slate-500 hover:text-blue-700"
        >
          ← กลับประวัติบิล
        </Link>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">🧾 รายละเอียดบิล</h1>
            <p className="mt-2 text-slate-500">ห้อง {bill.rooms.room_code}</p>
            <p className="text-slate-500">
              ผู้เช่า:{" "}
              <span className="font-medium text-slate-900">
                {bill.tenants?.full_name || "-"}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1.5">
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
          </div>
        </div>

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
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            แก้ไขข้อมูลบิล
          </Link>

          <Link
            href={`/pay/${bill.public_token}`}
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            👁 ดูบิลสำหรับผู้เช่า
          </Link>

        </div>

        {bill.status === "paid" && bill.paid_at && (
          <p className="mt-4 text-right text-sm text-slate-500">
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

