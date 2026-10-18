"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bangkokDate } from "@/lib/format";
import { addDays } from "@/lib/meter";
import { primaryButton } from "../_components/InfoCard";

const input = "w-full rounded-lg border border-sand-300 bg-white px-3 py-2";

/** Type in a day's usage by hand (days the meter API cannot give back). */
export function MeterForm({ roomId }: { roomId: string }) {
  const router = useRouter();
  const today = bangkokDate();
  const [date, setDate] = useState(addDays(today, -1));
  const [kwh, setKwh] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/rooms/${roomId}/meter`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, kwh, note }),
    });
    const body = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) return setMessage({ ok: false, text: body.error ?? "บันทึกไม่สำเร็จ" });
    setMessage({ ok: true, text: "บันทึกแล้ว" });
    setKwh("");
    setNote("");
    setDate(addDays(date, -1));
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-[10rem_9rem_1fr_auto] sm:items-end">
      <label className="text-sm font-medium">
        วันที่
        <input type="date" required max={today} value={date} onChange={(event) => setDate(event.target.value)} className={`mt-1 ${input}`} />
      </label>
      <label className="text-sm font-medium">
        หน่วยที่ใช้ (kWh)
        <input type="number" required min="0" step="0.001" inputMode="decimal" value={kwh} onChange={(event) => setKwh(event.target.value)} className={`mt-1 ${input}`} />
      </label>
      <label className="text-sm font-medium">
        หมายเหตุ
        <input type="text" maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} className={`mt-1 ${input}`} />
      </label>
      <button type="submit" disabled={saving} className={`${primaryButton} justify-center disabled:opacity-60`}>
        {saving ? "กำลังบันทึก..." : "บันทึก"}
      </button>
      {message && (
        <p role="status" className={`text-sm sm:col-span-4 ${message.ok ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}

export function DeleteDayButton({ roomId, date }: { roomId: string; date: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("ลบข้อมูลของวันนี้?")) return;
    setBusy(true);
    await fetch(`/api/rooms/${roomId}/meter?date=${date}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={remove} disabled={busy} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-60">
      ลบ
    </button>
  );
}
