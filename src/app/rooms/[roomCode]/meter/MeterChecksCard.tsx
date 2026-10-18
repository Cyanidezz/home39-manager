"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { bangkokDate, formatThaiDate } from "@/lib/format";
import type { CheckComparison, MeterCheck } from "@/lib/meterChecks";
import { primaryButton } from "../_components/InfoCard";

const input = "w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm";
const num = (value: number, digits = 2) => value.toLocaleString("th-TH", { maximumFractionDigits: digits });

/** Temporary: disc-meter readings noted by hand, compared with the smart meter. Remove together with the meter_checks table. */
export default function MeterChecksCard({ roomId, checks, comparisons }: { roomId: string; checks: MeterCheck[]; comparisons: CheckComparison[] }) {
  const router = useRouter();
  const today = bangkokDate();
  const [date, setDate] = useState(today);
  const [reading, setReading] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(reading);
    if (reading.trim() === "" || !Number.isFinite(value) || value < 0) return setError("กรุณากรอกเลขมิเตอร์เป็นตัวเลข");
    setBusy(true);
    setError(null);
    const { error: saveError } = await createClient()
      .from("meter_checks")
      .upsert({ room_id: roomId, check_date: date, disc_reading: value }, { onConflict: "room_id,check_date" });
    setBusy(false);
    if (saveError) return setError("บันทึกไม่สำเร็จ");
    setReading("");
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("ลบเลขที่จดไว้นี้?")) return;
    await createClient().from("meter_checks").delete().eq("id", id);
    router.refresh();
  }

  return (
    <details className="rounded-2xl border border-sand-200 bg-white shadow-sm" open={checks.length > 0}>
      <summary className="cursor-pointer px-4 py-3 font-semibold sm:px-6">ตรวจเทียบกับมิเตอร์จานหมุน (ชั่วคราว)</summary>
      <div className="space-y-4 border-t border-sand-100 px-4 py-4 sm:px-6">
        <p className="text-sm text-sand-500">
          จดเลขจานหมุนตอนเช้า ระบบเทียบหน่วยที่ใช้ระหว่างสองครั้งที่จด กับหน่วยที่มิเตอร์ Tuya นับได้ในช่วงเดียวกัน (ยอด ณ เที่ยงคืนต้นวันที่จด)
        </p>

        <form onSubmit={save} className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">
            วันที่จด
            <input type="date" max={today} required value={date} onChange={(event) => setDate(event.target.value)} className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm font-medium">
            เลขจานหมุน
            <input type="number" min="0" step="0.01" inputMode="decimal" required value={reading} onChange={(event) => setReading(event.target.value)} className={`mt-1 w-36 ${input}`} />
          </label>
          <button type="submit" disabled={busy} className={`${primaryButton} disabled:opacity-60`}>{busy ? "..." : "บันทึก"}</button>
          {error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}
        </form>

        {comparisons.length > 0 && (
          <ul className="divide-y divide-sand-100 rounded-xl border border-sand-100">
            {comparisons.map((row) => (
              <li key={`${row.from}-${row.to}`} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="text-sand-600">{formatThaiDate(row.from)} → {formatThaiDate(row.to)}</span>
                <span className="font-semibold">
                  จานหมุน {num(row.disc)} • Tuya {row.tuya === null ? "ไม่มีข้อมูล" : num(row.tuya, 3)} kWh
                  {row.diffPercent !== null && (
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${Math.abs(row.diffPercent) <= 3 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      ต่าง {row.diffPercent > 0 ? "+" : ""}{row.diffPercent}%
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {checks.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {[...checks].reverse().map((check) => (
              <li key={check.id} className="flex items-center gap-2 rounded-full bg-sand-50 px-3 py-1">
                {formatThaiDate(check.check_date)}: <strong>{num(Number(check.disc_reading))}</strong>
                <button type="button" onClick={() => remove(check.id)} aria-label="ลบ" className="text-red-600 hover:underline">ลบ</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
