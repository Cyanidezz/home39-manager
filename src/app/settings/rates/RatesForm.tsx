"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_ELECTRICITY_RATE, MAX_WATER_RATE, parseRate, type BillingRates } from "@/lib/billingRates";

const input = "w-full rounded-lg border px-4 py-3 text-lg font-semibold outline-none focus:ring-2 focus:ring-brand-500";

export default function RatesForm({ initialRates }: { initialRates: BillingRates }) {
  const supabase = createClient();
  const [water, setWater] = useState(String(initialRates.water));
  const [electricity, setElectricity] = useState(String(initialRates.electricity));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const waterRate = parseRate(water, MAX_WATER_RATE);
    const electricityRate = parseRate(electricity, MAX_ELECTRICITY_RATE);
    if (waterRate === null || electricityRate === null) {
      return setMessage({ ok: false, text: "กรุณากรอกอัตราเป็นตัวเลขที่มากกว่า 0 (ค่าน้ำไม่เกิน 10,000 และค่าไฟไม่เกิน 1,000)" });
    }
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from("billing_settings").upsert(
      { id: "default", water_rate_per_person: waterRate, electricity_rate: electricityRate, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    );
    setSaving(false);
    if (error) return setMessage({ ok: false, text: error.message });
    setWater(String(waterRate));
    setElectricity(String(electricityRate));
    setMessage({ ok: true, text: "บันทึกอัตราเรียบร้อยแล้ว" });
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <label className="block text-sm font-medium">
        ค่าน้ำ (บาท/คน/เดือน)
        <input type="number" inputMode="decimal" min="0" step="0.01" required value={water} onChange={(event) => setWater(event.target.value)} className={`mt-2 ${input}`} />
      </label>
      <label className="block text-sm font-medium">
        ค่าไฟ (บาท/หน่วย)
        <input type="number" inputMode="decimal" min="0" step="0.01" required value={electricity} onChange={(event) => setElectricity(event.target.value)} className={`mt-2 ${input}`} />
      </label>

      <p className="rounded-xl bg-sand-50 p-4 text-sm text-sand-600">
        อัตราใหม่ใช้กับบิลที่ออกหลังจากนี้เท่านั้น บิลที่ออกไปแล้วยังคงใช้อัตราเดิมที่บันทึกไว้ในบิล
      </p>

      {message && (
        <div role="status" className={`rounded-lg p-3 text-sm ${message.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <button type="submit" disabled={saving} className="w-full rounded-lg bg-brand-300 py-3 font-medium text-brand-950 transition hover:bg-brand-400 disabled:opacity-50">
        {saving ? "กำลังบันทึก..." : "บันทึกอัตรา"}
      </button>
    </form>
  );
}
