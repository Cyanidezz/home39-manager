"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  roomId: string;
  roomCode: string;
  monthlyRent: number;
  occupantCount: number;
  previousMeter: number | null;
  tenantId: string;
  tenantName: string;
};

type OtherItem = {
  name: string;
  amount: string;
};

const WATER_RATE = 150;
const ELECTRICITY_RATE = 7;

export default function BillForm({
  roomId,
  roomCode,
  monthlyRent,
  occupantCount,
  previousMeter,
  tenantId,
  tenantName,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const now = new Date();

  const [billingYear, setBillingYear] = useState(now.getFullYear());
  const [billingMonth, setBillingMonth] = useState(now.getMonth() + 1);
  const [currentMeter, setCurrentMeter] = useState("");
  const [otherItems, setOtherItems] = useState<OtherItem[]>([
    { name: "", amount: "" },
  ]);
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const waterAmount = occupantCount * WATER_RATE;

  const electricityUnits = useMemo(() => {
    if (previousMeter === null || currentMeter === "") return 0;
    const current = Number(currentMeter);
    if (!Number.isFinite(current)) return 0;
    return Math.max(0, current - previousMeter);
  }, [currentMeter, previousMeter]);

  const electricityAmount = electricityUnits * ELECTRICITY_RATE;

  const validOtherItems = otherItems.filter(
    (item) =>
      item.name.trim() !== "" &&
      item.amount !== "" &&
      Number.isFinite(Number(item.amount)) &&
      Number(item.amount) > 0
  );

  const other = validOtherItems.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  );

  const totalAmount = monthlyRent + waterAmount + electricityAmount + other;

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

    const invalidOtherItem = otherItems.some((item) => {
      const hasName = item.name.trim() !== "";
      const hasAmount = item.amount !== "";
      const amount = Number(item.amount);

      if (!hasName && !hasAmount) return false;
      if (!hasName || !hasAmount) return true;
      return !Number.isFinite(amount) || amount <= 0;
    });

    if (invalidOtherItem) {
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
        p_rent_amount: monthlyRent,
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
        p_due_date: dueDate || null,
        p_items: items,
      }
    );

    if (rpcError || !newBillId) {
      const message = rpcError?.message || "ไม่สามารถสร้างบิลได้";
      setError(
        message.includes("already exists")
          ? `ห้อง ${roomCode} มีบิล ${billingMonth}/${billingYear} อยู่แล้ว`
          : message
      );
      setLoading(false);
      return;
    }

    router.push(`/rooms/${roomCode}/bills/${newBillId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <p className="text-sm text-gray-500">
        ผู้เช่า: <strong className="text-gray-800">{tenantName}</strong>
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block font-medium">เดือน</label>
          <select
            value={billingMonth}
            onChange={(e) => setBillingMonth(Number(e.target.value))}
            className="w-full rounded-lg border px-4 py-3"
          >
            {[
              "มกราคม",
              "กุมภาพันธ์",
              "มีนาคม",
              "เมษายน",
              "พฤษภาคม",
              "มิถุนายน",
              "กรกฎาคม",
              "สิงหาคม",
              "กันยายน",
              "ตุลาคม",
              "พฤศจิกายน",
              "ธันวาคม",
            ].map((month, index) => (
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

      <div className="rounded-xl bg-gray-50 p-5">
        <div className="flex justify-between">
          <span>ค่าเช่า</span>
          <strong>{monthlyRent.toLocaleString()} บาท</strong>
        </div>
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
          className="w-full rounded-lg border bg-gray-100 px-4 py-3"
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

      <div className="rounded-xl bg-blue-50 p-5">
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

      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="font-medium">ค่าใช้จ่ายอื่น</label>
          <button
            type="button"
            onClick={addOtherItem}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
          >
            + เพิ่มรายการ
          </button>
        </div>

        <div className="space-y-3">
          {otherItems.map((item, index) => (
            <div key={index} className="grid grid-cols-[1fr_160px_auto] gap-3">
              <input
                value={item.name}
                onChange={(e) => updateOtherItem(index, "name", e.target.value)}
                className="rounded-lg border px-4 py-3"
                placeholder="ชื่อรายการ เช่น ค่ากุญแจ"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.amount}
                onChange={(e) => updateOtherItem(index, "amount", e.target.value)}
                className="rounded-lg border px-4 py-3 text-right"
                placeholder="จำนวนเงิน"
              />
              <button
                type="button"
                onClick={() => removeOtherItem(index)}
                className="rounded-lg border px-3 text-gray-500 hover:bg-red-50 hover:text-red-600"
                title="ลบรายการ"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <span className="text-sm text-gray-600">
            รวมค่าใช้จ่ายอื่น{" "}
            <strong className="text-black">
              {other.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} บาท
            </strong>
          </span>
        </div>
      </div>

      <div>
        <label className="mb-2 block font-medium">กำหนดชำระ</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
        />
      </div>

      <div className="rounded-xl bg-green-50 p-6">
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

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "🧾 บันทึกและออกบิล"}
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
