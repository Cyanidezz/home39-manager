import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatusEditor from "./StatusEditor";
import SlipViewer from "./SlipViewer";
import SendBillLineButton from "@/components/SendBillLineButton";
import { publicAppUrl, pushLineText } from "@/lib/line";

type Props = {
  params: Promise<{
    roomCode: string;
    billId: string;
  }>;
};

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function formatMoney(value: number | string | null) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | string | null) {
  return Number(value || 0).toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  });
}

function formatThaiDate(date: string | null) {
  if (!date) return "-";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${Number(year) + 543}`;
}

function getStatus(status: string) {
  switch (status) {
    case "paid":
      return { text: "ชำระแล้ว", className: "bg-green-100 text-green-700" };
    case "unpaid":
      return { text: "ยังไม่ชำระ", className: "bg-red-100 text-red-700" };
    case "overdue":
      return { text: "เกินกำหนด", className: "bg-orange-100 text-orange-700" };
    case "slip_submitted":
      return { text: "ส่งสลิปแล้ว", className: "bg-blue-100 text-blue-700" };
    case "verifying":
      return { text: "กำลังตรวจสอบ", className: "bg-yellow-100 text-yellow-700" };
    case "rejected":
      return { text: "สลิปไม่ผ่าน", className: "bg-red-100 text-red-700" };
    case "draft":
      return { text: "ฉบับร่าง", className: "bg-gray-100 text-gray-700" };
    default:
      return { text: status, className: "bg-gray-100 text-gray-700" };
  }
}

async function notifyTenantAboutStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  billId: string,
  newStatus: string
) {
  if (!["paid", "rejected", "verifying"].includes(newStatus)) return;

  const { data: bill } = await supabase
    .from("bills")
    .select("total_amount, public_token, rooms(room_code), tenants(line_user_id)")
    .eq("id", billId)
    .single();

  if (!bill) return;
  const tenant = Array.isArray(bill.tenants) ? bill.tenants[0] : bill.tenants;
  const room = Array.isArray(bill.rooms) ? bill.rooms[0] : bill.rooms;
  if (!tenant?.line_user_id) return;

  const amount = Number(bill.total_amount).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const roomText = room?.room_code || "-";
  const messages: Record<string, string> = {
    paid: `Home39 ยืนยันการชำระเงินแล้ว\nห้อง ${roomText}\nยอด ${amount} บาท\nขอบคุณค่ะ`,
    verifying: `Home39 ได้รับสลิปของห้อง ${roomText} แล้ว\nกำลังตรวจสอบหลักฐานการชำระเงิน`,
    rejected: `Home39 ตรวจสอบสลิปห้อง ${roomText} ไม่ผ่าน\nกรุณาตรวจสอบและส่งสลิปใหม่ที่ ${publicAppUrl()}/pay/${bill.public_token}`,
  };

  await pushLineText(tenant.line_user_id, messages[newStatus]);
}

async function setBillStatus(
  billId: string,
  newStatus: string,
  reason: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("update_bill_status", {
    p_bill_id: billId,
    p_new_status: newStatus,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  try {
    await notifyTenantAboutStatus(supabase, billId, newStatus);
  } catch (notificationError) {
    console.error("LINE status notification failed:", notificationError);
  }
}

async function markBillAsPaid(formData: FormData) {
  "use server";

  const billId = String(formData.get("billId") || "");
  const roomCode = String(formData.get("roomCode") || "");

  if (!billId || !roomCode) {
    throw new Error("ข้อมูลบิลไม่ครบ");
  }

  await setBillStatus(billId, "paid", "บันทึกชำระเงินโดยผู้ดูแล");
  redirect(`/rooms/${roomCode}/bills/${billId}`);
}

async function updateBillStatus(formData: FormData) {
  "use server";

  const billId = String(formData.get("billId") || "");
  const roomCode = String(formData.get("roomCode") || "");
  const newStatus = String(formData.get("newStatus") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!billId || !roomCode || !newStatus || !reason) {
    throw new Error("กรุณากรอกข้อมูลให้ครบ");
  }

  const allowedStatuses = [
    "unpaid",
    "paid",
    "overdue",
    "slip_submitted",
    "verifying",
    "rejected",
    "draft",
  ];

  if (!allowedStatuses.includes(newStatus)) {
    throw new Error("สถานะไม่ถูกต้อง");
  }

  await setBillStatus(billId, newStatus, reason);
  redirect(`/rooms/${roomCode}/bills/${billId}`);
}

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

  const status = getStatus(bill.status);
  let slipUrl: string | null = null;

  if (bill.slip_path) {
    const { data: slipData } = await supabase.storage
      .from("payment-slips")
      .createSignedUrl(bill.slip_path, 60 * 10);
    slipUrl = slipData?.signedUrl ?? null;
  }

  const billItems = [...(bill.bill_items || [])].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/rooms/${bill.rooms.room_code}/bills`}
          className="text-sm text-gray-500 hover:text-black"
        >
          ← กลับประวัติบิล
        </Link>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">🧾 รายละเอียดบิล</h1>
            <p className="mt-2 text-gray-500">ห้อง {bill.rooms.room_code}</p>
            <p className="text-gray-500">
              ผู้เช่า:{" "}
              <span className="font-medium text-gray-900">
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

        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <p className="text-xl font-bold">
              {thaiMonths[bill.billing_month - 1]} {bill.billing_year + 543}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              กำหนดชำระ: {formatThaiDate(bill.due_date)}
            </p>
          </div>

          <div className="border-b px-6 py-5">
            <div className="flex justify-between">
              <span>ค่าเช่า</span>
              <span className="font-semibold">{formatMoney(bill.rent_amount)} บาท</span>
            </div>
          </div>

          <div className="border-b px-6 py-5">
            <div className="flex justify-between">
              <div>
                <p>ค่าน้ำ</p>
                <p className="mt-1 text-sm text-gray-500">
                  {bill.occupant_count} คน × {formatNumber(bill.water_rate_per_person)} บาท
                </p>
              </div>
              <span className="font-semibold">{formatMoney(bill.water_amount)} บาท</span>
            </div>
          </div>

          <div className="border-b px-6 py-5">
            <h2 className="font-semibold">ค่าไฟฟ้า</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">มิเตอร์ครั้งก่อน</span>
                <span>{bill.previous_meter != null ? formatNumber(bill.previous_meter) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">มิเตอร์ครั้งนี้</span>
                <span>{bill.current_meter != null ? formatNumber(bill.current_meter) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">หน่วยไฟที่ใช้</span>
                <span>{formatNumber(bill.electricity_units)} หน่วย</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>
                  ค่าไฟ {formatNumber(bill.electricity_units)} × {formatNumber(bill.electricity_rate)}
                </span>
                <span className="font-semibold">{formatMoney(bill.electricity_amount)} บาท</span>
              </div>
            </div>
          </div>

          {billItems.length > 0 && (
            <div className="border-b px-6 py-5">
              <h2 className="mb-4 font-semibold">ค่าใช้จ่ายอื่น</h2>
              <div className="space-y-3">
                {billItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.item_name}</span>
                    <span className="font-semibold">{formatMoney(item.amount)} บาท</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 px-6 py-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">ยอดรวม</span>
              <span className="text-2xl font-bold">{formatMoney(bill.total_amount)} บาท</span>
            </div>
          </div>
        </div>

        {bill.slip_path && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-blue-950">หลักฐานการชำระเงิน</h2>
                <p className="mt-1 text-sm text-blue-700">
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
                  fileName={bill.slip_original_name || "ไฟล์สลิป"}
                  billId={bill.id}
                  roomCode={bill.rooms.room_code}
                  isPaid={bill.status === "paid"}
                  markBillAsPaid={markBillAsPaid}
                />
              ) : (
                <span className="text-sm text-red-700">ไม่สามารถเปิดไฟล์สลิปได้</span>
              )}
            </div>
          </section>
        )}

        <div className="mt-6 flex flex-wrap items-start justify-end gap-3">
          <SendBillLineButton billId={bill.id} />
          <Link
            href={`/rooms/${bill.rooms.room_code}/bills/${bill.id}/edit`}
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            แก้ไขข้อมูลบิล
          </Link>

          <Link
            href={`/pay/${bill.public_token}`}
            target="_blank"
            rel="noopener noreferrer"
            prefetch={false}
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            👁 ดูบิลสำหรับผู้เช่า
          </Link>

        </div>

        {bill.status === "paid" && bill.paid_at && (
          <p className="mt-4 text-right text-sm text-gray-500">
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
