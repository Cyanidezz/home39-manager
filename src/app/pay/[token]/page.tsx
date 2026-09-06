import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";

type Props = {
  params: Promise<{ token: string }>;
};

type PublicBillItem = {
  item_name: string;
  amount: number | string;
};

type PaymentSettings = {
  bank_name: string;
  bank_code: string | null;
  account_name: string;
  account_number: string;
};

type PublicBill = {
  room_code: string | null;
  tenant_name: string | null;
  billing_year: number;
  billing_month: number;
  rent_amount: number | string;
  occupant_count: number;
  water_rate_per_person: number | string;
  water_amount: number | string;
  previous_meter: number | string | null;
  current_meter: number | string | null;
  electricity_units: number | string;
  electricity_rate: number | string;
  electricity_amount: number | string;
  other_amount: number | string;
  total_amount: number | string;
  due_date: string | null;
  status: string;
  issued_at: string | null;
  paid_at: string | null;
  bill_items: PublicBillItem[];
  payment_settings: PaymentSettings | null;
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
    case "paid": return { text: "ชำระแล้ว", className: "bg-green-100 text-green-700" };
    case "unpaid": return { text: "ยังไม่ชำระ", className: "bg-red-100 text-red-700" };
    case "overdue": return { text: "เกินกำหนด", className: "bg-orange-100 text-orange-700" };
    case "slip_submitted": return { text: "ส่งสลิปแล้ว", className: "bg-blue-100 text-blue-700" };
    case "verifying": return { text: "กำลังตรวจสอบ", className: "bg-yellow-100 text-yellow-700" };
    case "rejected": return { text: "สลิปไม่ผ่าน", className: "bg-red-100 text-red-700" };
    case "draft": return { text: "ฉบับร่าง", className: "bg-gray-100 text-gray-700" };
    default: return { text: status, className: "bg-gray-100 text-gray-700" };
  }
}

export default async function PublicBillPage({ params }: Props) {
  const { token } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    notFound();
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_bill", { p_token: token });

  if (error || !data) {
    console.error("Public bill RPC error:", error);
    notFound();
  }

  const bill = data as PublicBill;
  const status = getStatus(bill.status);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">🏠 Home39</h1>
          <p className="mt-1 text-gray-500">ใบแจ้งค่าใช้จ่าย</p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-bold">ห้อง {bill.room_code || "-"}</p>
                <p className="mt-1 text-sm text-gray-500">ผู้เช่า: {bill.tenant_name || "-"}</p>
              </div>
              <span className={`rounded-full px-4 py-2 text-sm font-semibold ${status.className}`}>
                {status.text}
              </span>
            </div>
            <div className="mt-5 rounded-xl bg-gray-50 p-4">
              <p className="font-semibold">{thaiMonths[bill.billing_month - 1]} {bill.billing_year + 543}</p>
              <p className="mt-1 text-sm text-gray-500">กำหนดชำระ: {formatThaiDate(bill.due_date)}</p>
            </div>
          </div>

          <div className="border-t px-6 py-5">
            <div className="flex justify-between gap-4">
              <span>ค่าเช่า</span>
              <span className="font-semibold">{formatMoney(bill.rent_amount)} บาท</span>
            </div>
          </div>

          <div className="border-t px-6 py-5">
            <div className="flex justify-between gap-4">
              <div>
                <p>ค่าน้ำ</p>
                <p className="mt-1 text-sm text-gray-500">
                  {bill.occupant_count} คน × {formatNumber(bill.water_rate_per_person)} บาท
                </p>
              </div>
              <span className="font-semibold">{formatMoney(bill.water_amount)} บาท</span>
            </div>
          </div>

          <div className="border-t px-6 py-5">
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
                <span>ค่าไฟ {formatNumber(bill.electricity_units)} × {formatNumber(bill.electricity_rate)}</span>
                <span className="font-semibold">{formatMoney(bill.electricity_amount)} บาท</span>
              </div>
            </div>
          </div>

          {bill.bill_items?.length > 0 && (
            <div className="border-t px-6 py-5">
              <h2 className="mb-4 font-semibold">ค่าใช้จ่ายอื่น</h2>
              <div className="space-y-3">
                {bill.bill_items.map((item, index) => (
                  <div key={`${item.item_name}-${index}`} className="flex justify-between gap-4">
                    <span>{item.item_name}</span>
                    <span className="font-semibold">{formatMoney(item.amount)} บาท</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t bg-gray-50 px-6 py-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-lg font-bold">ยอดชำระ</span>
              <span className="text-2xl font-bold">{formatMoney(bill.total_amount)} บาท</span>
            </div>
          </div>

          {bill.status !== "paid" && bill.payment_settings && (
            <div className="border-t bg-purple-50 px-6 py-6">
              <h2 className="font-bold text-purple-900">ช่องทางชำระเงิน</h2>

              <div className="mt-4 rounded-xl border border-purple-200 bg-white p-5">
                <p className="text-sm font-medium text-purple-700">
                  {bill.payment_settings.bank_name}
                  {bill.payment_settings.bank_code
                    ? ` (${bill.payment_settings.bank_code.toUpperCase()})`
                    : ""}
                </p>

                <p className="mt-3 text-sm text-gray-500">ชื่อบัญชี</p>
                <p className="font-semibold">{bill.payment_settings.account_name}</p>

                <p className="mt-3 text-sm text-gray-500">เลขที่บัญชี</p>
                <p className="select-all text-2xl font-bold tracking-wide text-purple-900">
                  {bill.payment_settings.account_number}
                </p>

                <div className="mt-4 rounded-lg bg-purple-50 p-3 text-sm text-purple-800">
                  กรุณาโอนจำนวน{" "}
                  <strong>{formatMoney(bill.total_amount)} บาท</strong>
                  {" "}และระบุห้อง{" "}
                  <strong>{bill.room_code || "-"}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">กรุณาตรวจสอบรายละเอียดก่อนชำระเงิน</p>
      </div>
    </main>
  );
}
