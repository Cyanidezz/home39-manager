"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ELECTRICITY_RATE,
  WATER_RATE,
  billCreationError,
  electricityUnitsUsed,
  hasInvalidOtherItem,
  isValidOtherItem,
  type OtherItem,
} from "@/lib/billing";
import { thaiMonthNames } from "@/lib/format";
import OtherItemsEditor from "./_components/OtherItemsEditor";
import { nullable } from "@/lib/supabase/rpc";
import Icon from "@/components/Icon";

type Props = {
  roomId: string;
  roomCode: string;
  monthlyRent: number;
  occupantCount: number;
  previousMeter: number | null;
  tenantId: string;
  tenantName: string;
  tenantHasLine: boolean;
  /** Periods that already have a bill, as "YYYY-MM". */
  existingPeriods: string[];
  rentWaivedYear: number | null;
  rentWaivedMonth: number | null;
};

function firstFreePeriod(from: Date, existing: string[]): [number, number] {
  let year = from.getFullYear();
  let month = from.getMonth() + 1;
  for (let i = 0; i < 24; i++) {
    if (!existing.includes(`${year}-${String(month).padStart(2, "0")}`)) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return [year, month];
}

export default function BillForm({
  roomId,
  roomCode,
  monthlyRent,
  occupantCount,
  previousMeter,
  tenantId,
  tenantName,
  tenantHasLine,
  existingPeriods,
  rentWaivedYear,
  rentWaivedMonth,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const now = new Date();

  // Start at the first month from now that has no bill yet.
  const [initialYear, initialMonth] = firstFreePeriod(now, existingPeriods);
  const [billingYear, setBillingYear] = useState(initialYear);
  const [billingMonth, setBillingMonth] = useState(initialMonth);
  const [currentMeter, setCurrentMeter] = useState("");
  const [otherItems, setOtherItems] = useState<OtherItem[]>([
    { name: "", amount: "" },
  ]);
  const [dueDate, setDueDate] = useState("");
  const [sendLine, setSendLine] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const waterAmount = occupantCount * WATER_RATE;

  const electricityUnits = useMemo(
    () => electricityUnitsUsed(previousMeter, currentMeter),
    [currentMeter, previousMeter]
  );

  const electricityAmount = electricityUnits * ELECTRICITY_RATE;

  const validOtherItems = otherItems.filter(isValidOtherItem);

  const other = validOtherItems.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const duplicatePeriod = existingPeriods.includes(
    `${billingYear}-${String(billingMonth).padStart(2, "0")}`
  );
  const isRentWaived =
    billingYear === rentWaivedYear && billingMonth === rentWaivedMonth;
  const chargedRent = isRentWaived ? 0 : monthlyRent;
  const totalAmount = chargedRent + waterAmount + electricityAmount + other;

  function addOtherItem() {
    setOtherItems((items) => [...items, { name: "", amount: "" }]);
  }

  function updateOtherItem(
    index: number,
    field: "name" | "amount",
    value: string
  ) {
    setOtherItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeOtherItem(index: number) {
    setOtherItems((items) => {
      if (items.length === 1) return [{ name: "", amount: "" }];
      return items.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!tenantId) {
      setError("ไม่พบผู้เช่าปัจจุบันของห้องนี้");
      return;
    }

    if (previousMeter === null) {
      setError("ยังไม่มีมิเตอร์ครั้งก่อน กรุณากำหนดมิเตอร์เริ่มต้นก่อนออกบิล");
      return;
    }

    if (currentMeter === "") {
      setError("กรุณากรอกมิเตอร์ไฟครั้งนี้");
      return;
    }

    const current = Number(currentMeter);
    if (!Number.isFinite(current)) {
      setError("ค่ามิเตอร์ไฟไม่ถูกต้อง");
      return;
    }

    if (current < previousMeter) {
      setError(`มิเตอร์ครั้งนี้ต้องไม่น้อยกว่า ${previousMeter}`);
      return;
    }

    if (hasInvalidOtherItem(otherItems)) {
      setError(
        "กรุณากรอกชื่อรายการและจำนวนเงินของค่าใช้จ่ายอื่นให้ครบ และจำนวนเงินต้องมากกว่า 0"
      );
      return;
    }

    setLoading(true);

    const items = validOtherItems.map((item) => ({
      item_name: item.name.trim(),
      amount: Number(item.amount),
    }));

    const { data: newBillId, error: rpcError } = await supabase.rpc(
      "create_bill_with_items",
      {
        p_room_id: roomId,
        p_tenant_id: tenantId,
        p_billing_year: billingYear,
        p_billing_month: billingMonth,
        p_rent_amount: chargedRent,
        p_occupant_count: occupantCount,
        p_water_rate_per_person: WATER_RATE,
        p_water_amount: waterAmount,
        p_previous_meter: previousMeter,
        p_current_meter: current,
        p_electricity_units: electricityUnits,
        p_electricity_rate: ELECTRICITY_RATE,
        p_electricity_amount: electricityAmount,
        p_other_amount: other,
        p_total_amount: totalAmount,
        p_due_date: nullable(dueDate || null),
        p_items: items,
      }
    );

    if (rpcError || !newBillId) {
      const message = rpcError?.message || "ไม่สามารถสร้างบิลได้";
      setError(billCreationError(message, { roomCode, month: billingMonth, year: billingYear }));
      setLoading(false);
      return;
    }

    // The bill is already saved; a failed LINE push is reported on the detail page,
    // where it can be resent with the "send via LINE" button.
    let lineResult: "sent" | "failed" | null = null;
    if (tenantHasLine && sendLine) {
      try {
        const response = await fetch(`/api/line/bills/${newBillId}/send`, {
          method: "POST",
          signal: AbortSignal.timeout(15000),
        });
        lineResult = response.ok ? "sent" : "failed";
      } catch {
        lineResult = "failed";
      }
    }

    router.push(
      `/rooms/${roomCode}/bills/${newBillId}${lineResult ? `?lineSend=${lineResult}` : ""}`
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <p className="text-sm text-sand-500">
        ผู้เช่า: <strong className="text-sand-800">{tenantName}</strong>
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block font-medium">เดือน</label>
          <select
            value={billingMonth}
            onChange={(e) => setBillingMonth(Number(e.target.value))}
            className="w-full rounded-lg border px-4 py-3"
          >
            {thaiMonthNames.map((month, index) => (
              <option key={month} value={index + 1}>{month}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block font-medium">ปี ค.ศ.</label>
          <input
            type="number"
            value={billingYear}
            onChange={(e) => setBillingYear(Number(e.target.value))}
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>
      </div>

      <div className="rounded-xl bg-sand-50 p-5">
        <div className="flex justify-between gap-4">
          <span>ค่าเช่า</span>
          <strong>
            {isRentWaived ? (
              <>
                <span className="mr-2 font-normal text-sand-500 line-through">
                  {monthlyRent.toLocaleString()}
                </span>
                0 บาท
              </>
            ) : (
              `${monthlyRent.toLocaleString()} บาท`
            )}
          </strong>
        </div>
        {isRentWaived && (
          <p className="mt-2 text-sm text-orange-700">
            ใช้ค่าเช่าล่วงหน้าที่ชำระไว้เมื่อเริ่มสัญญา
          </p>
        )}
        <div className="mt-3 flex justify-between">
          <span>ค่าน้ำ {occupantCount} × {WATER_RATE}</span>
          <strong>{waterAmount.toLocaleString()} บาท</strong>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-medium">มิเตอร์ครั้งก่อน</label>
        <input
          value={previousMeter ?? ""}
          disabled
          className="w-full rounded-lg border bg-sand-100 px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">มิเตอร์ครั้งนี้ *</label>
        <input
          type="number"
          min={previousMeter ?? undefined}
          step="0.01"
          value={currentMeter}
          onChange={(e) => setCurrentMeter(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
          placeholder="กรอกเลขมิเตอร์ล่าสุด"
        />
      </div>

      <div className="rounded-xl bg-brand-50 p-5">
        <div className="flex justify-between">
          <span>หน่วยไฟที่ใช้</span>
          <strong>{electricityUnits.toFixed(2)} หน่วย</strong>
        </div>
        <div className="mt-2 flex justify-between">
          <span>ค่าไฟ {electricityUnits.toFixed(2)} × {ELECTRICITY_RATE}</span>
          <strong>
            {electricityAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} บาท
          </strong>
        </div>
      </div>

      <OtherItemsEditor
        items={otherItems}
        total={other}
        onAdd={addOtherItem}
        onChange={updateOtherItem}
        onRemove={removeOtherItem}
      />

      <div>
        <label className="mb-2 block font-medium">กำหนดชำระ</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
        />
      </div>

      <div className="rounded-xl bg-brand-100 p-6">
        <div className="flex items-end justify-between">
          <span className="font-medium">ยอดรวม</span>
          <strong className="text-3xl">
            {totalAmount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} บาท
          </strong>
        </div>
      </div>

      {duplicatePeriod && (
        <div role="alert" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          ห้องนี้มีบิลของเดือน {billingMonth}/{billingYear} อยู่แล้ว กรุณาเลือกเดือนอื่น หรือแก้ไขบิลเดิมจากประวัติบิล
        </div>
      )}

      {tenantHasLine ? (
        <label className="flex items-start gap-3 rounded-xl border border-sand-200 p-4">
          <input
            type="checkbox"
            checked={sendLine}
            onChange={(e) => setSendLine(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="font-medium">ส่งบิลให้ผู้เช่าทาง LINE ทันทีหลังบันทึก</span>
            <span className="mt-1 block text-sm text-sand-500">
              ไม่ติ๊กไว้ก็ได้ แล้วตรวจบิลก่อนกดส่งเองจากหน้ารายละเอียดบิล
            </span>
          </span>
        </label>
      ) : (
        <p className="rounded-xl bg-sand-50 p-4 text-sm text-sand-500">
          ผู้เช่ายังไม่ได้ผูก LINE จึงไม่ส่งบิลอัตโนมัติ
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || duplicatePeriod}
          className="rounded-lg bg-brand-300 px-6 py-3 text-brand-950 disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : <><Icon name="receipt" /> บันทึกและออกบิล</>}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="rounded-lg border px-6 py-3 disabled:opacity-50"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

