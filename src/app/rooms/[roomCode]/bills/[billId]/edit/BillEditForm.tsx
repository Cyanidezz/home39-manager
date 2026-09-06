"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DeleteBillButton from "@/components/DeleteBillButton";

type OtherItem = { name: string; amount: string };
type Props = {
  billId: string;
  roomCode: string;
  initial: {
    billingYear: number;
    billingMonth: number;
    rentAmount: string;
    occupantCount: number;
    waterRate: string;
    previousMeter: string;
    currentMeter: string;
    electricityRate: string;
    dueDate: string;
    items: OtherItem[];
  };
};

const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

export default function BillEditForm({ billId, roomCode, initial }: Props) {
  const router = useRouter();
  const [billingYear, setBillingYear] = useState(initial.billingYear);
  const [billingMonth, setBillingMonth] = useState(initial.billingMonth);
  const [rentAmount, setRentAmount] = useState(initial.rentAmount);
  const [occupantCount, setOccupantCount] = useState(initial.occupantCount);
  const [waterRate, setWaterRate] = useState(initial.waterRate);
  const [previousMeter, setPreviousMeter] = useState(initial.previousMeter);
  const [currentMeter, setCurrentMeter] = useState(initial.currentMeter);
  const [electricityRate, setElectricityRate] = useState(initial.electricityRate);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [items, setItems] = useState<OtherItem[]>(initial.items.length ? initial.items : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const water = Math.max(0, occupantCount * Number(waterRate || 0));
    const units = Math.max(0, Number(currentMeter || 0) - Number(previousMeter || 0));
    const electricity = units * Number(electricityRate || 0);
    const other = items.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0);
    return { water, units, electricity, other, total: Number(rentAmount || 0) + water + electricity + other };
  }, [rentAmount, occupantCount, waterRate, previousMeter, currentMeter, electricityRate, items]);

  function updateItem(index: number, field: keyof OtherItem, value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (Number(currentMeter) < Number(previousMeter)) {
      setError("มิเตอร์ครั้งนี้ต้องไม่น้อยกว่ามิเตอร์ครั้งก่อน");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/bills/${billId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingYear, billingMonth, rentAmount, occupantCount, waterRate, previousMeter, currentMeter, electricityRate, dueDate, items }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "บันทึกไม่สำเร็จ");
      router.push(`/rooms/${roomCode}/bills/${billId}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกไม่สำเร็จ");
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-black";

  return (
    <form onSubmit={save} className="mt-8 space-y-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="font-medium">เดือน<select value={billingMonth} onChange={(e) => setBillingMonth(Number(e.target.value))} className={`${inputClass} mt-2`}>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
        <label className="font-medium">ปี ค.ศ.<input type="number" required min="2000" max="2200" value={billingYear} onChange={(e) => setBillingYear(Number(e.target.value))} className={`${inputClass} mt-2`} /></label>
        <label className="font-medium">ค่าเช่า<input type="number" required min="0" step="0.01" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="font-medium">จำนวนผู้พัก<input type="number" required min="0" value={occupantCount} onChange={(e) => setOccupantCount(Number(e.target.value))} className={`${inputClass} mt-2`} /></label>
        <label className="font-medium">ค่าน้ำต่อคน<input type="number" required min="0" step="0.01" value={waterRate} onChange={(e) => setWaterRate(e.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="font-medium">กำหนดชำระ<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="font-medium">มิเตอร์ครั้งก่อน<input type="number" required min="0" step="0.01" value={previousMeter} onChange={(e) => setPreviousMeter(e.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="font-medium">มิเตอร์ครั้งนี้<input type="number" required min="0" step="0.01" value={currentMeter} onChange={(e) => setCurrentMeter(e.target.value)} className={`${inputClass} mt-2`} /></label>
        <label className="font-medium">ค่าไฟต่อหน่วย<input type="number" required min="0" step="0.01" value={electricityRate} onChange={(e) => setElectricityRate(e.target.value)} className={`${inputClass} mt-2`} /></label>
      </div>

      <section>
        <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">ค่าใช้จ่ายอื่น</h2><button type="button" onClick={() => setItems((current) => [...current, { name: "", amount: "" }])} className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50">+ เพิ่มรายการ</button></div>
        <div className="mt-4 space-y-3">{items.map((item, index) => <div key={index} className="grid gap-3 sm:grid-cols-[1fr_160px_auto]"><input aria-label={`ชื่อรายการที่ ${index + 1}`} placeholder="ชื่อรายการ" value={item.name} onChange={(e) => updateItem(index, "name", e.target.value)} className={inputClass} /><input aria-label={`จำนวนเงินรายการที่ ${index + 1}`} type="number" min="0.01" step="0.01" placeholder="จำนวนเงิน" value={item.amount} onChange={(e) => updateItem(index, "amount", e.target.value)} className={inputClass} /><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl px-4 py-3 text-red-600 hover:bg-red-50">ลบรายการ</button></div>)}</div>
      </section>

      <section className="rounded-xl bg-slate-50 p-5"><div className="space-y-2 text-sm"><p className="flex justify-between"><span>ค่าน้ำ</span><strong>{totals.water.toLocaleString("th-TH")} บาท</strong></p><p className="flex justify-between"><span>ไฟฟ้า {totals.units.toLocaleString("th-TH")} หน่วย</span><strong>{totals.electricity.toLocaleString("th-TH")} บาท</strong></p><p className="flex justify-between"><span>ค่าใช้จ่ายอื่น</span><strong>{totals.other.toLocaleString("th-TH")} บาท</strong></p></div><div className="mt-4 flex justify-between border-t pt-4 text-xl font-bold"><span>ยอดรวมใหม่</span><span>{totals.total.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</span></div></section>
      {error && <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={() => router.back()} className="rounded-xl border px-5 py-3">ยกเลิก</button><button type="submit" disabled={loading} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button></div>

      <section className="border-t border-red-200 pt-7"><h2 className="font-bold text-red-800">ลบบิล</h2><p className="mt-1 text-sm text-slate-500">ลบบิล รายการค่าใช้จ่าย ประวัติ และสลิปที่เกี่ยวข้องอย่างถาวร</p><div className="mt-4"><DeleteBillButton billId={billId} roomCode={roomCode} billLabel={`${months[billingMonth - 1]} ${billingYear + 543} · ห้อง ${roomCode}`} /></div></section>
    </form>
  );
}
