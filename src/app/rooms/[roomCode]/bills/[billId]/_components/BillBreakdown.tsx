import { formatMoney, formatNumber, formatThaiDateShort, thaiMonths } from "@/lib/format";

export type BillItem = {
  id: string;
  item_name: string;
  amount: number | string | null;
};

export type BillBreakdownData = {
  billing_month: number;
  billing_year: number;
  due_date: string | null;
  rent_amount: number | string | null;
  occupant_count: number;
  water_rate_per_person: number | string | null;
  water_amount: number | string | null;
  previous_meter: number | string | null;
  current_meter: number | string | null;
  electricity_units: number | string | null;
  electricity_rate: number | string | null;
  electricity_amount: number | string | null;
  total_amount: number | string | null;
};

type Props = {
  bill: BillBreakdownData;
  items: BillItem[];
};

export default function BillBreakdown({ bill, items }: Props) {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b px-6 py-5">
        <p className="text-xl font-bold">
          {thaiMonths[bill.billing_month - 1]} {bill.billing_year + 543}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          กำหนดชำระ: {formatThaiDateShort(bill.due_date)}
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
            <p className="mt-1 text-sm text-slate-500">
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
            <span className="text-slate-500">มิเตอร์ครั้งก่อน</span>
            <span>{bill.previous_meter != null ? formatNumber(bill.previous_meter) : "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">มิเตอร์ครั้งนี้</span>
            <span>{bill.current_meter != null ? formatNumber(bill.current_meter) : "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">หน่วยไฟที่ใช้</span>
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

      {items.length > 0 && (
        <div className="border-b px-6 py-5">
          <h2 className="mb-4 font-semibold">ค่าใช้จ่ายอื่น</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.item_name}</span>
                <span className="font-semibold">{formatMoney(item.amount)} บาท</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-50 px-6 py-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">ยอดรวม</span>
          <span className="text-2xl font-bold">{formatMoney(bill.total_amount)} บาท</span>
        </div>
      </div>
    </div>
  );
}
