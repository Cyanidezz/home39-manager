"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type MeterDayView = {
  date: string;
  /** Day of the month, e.g. "19". */
  day: string;
  weekday: string;
  future: boolean;
  /** Stored usage, null when the day has no figure. */
  kwh: number | null;
  /** True when a row exists for the day, even without a figure (no previous total). */
  hasRow: boolean;
  source: string | null;
  note: string | null;
};

const input = "w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm";
const kwhText = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 3 });

/** One calendar day: shows the stored usage, or an input to type it in. */
export function MeterDayRow({ roomId, view }: { roomId: string; view: MeterDayView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [kwh, setKwh] = useState(view.kwh === null ? "" : String(view.kwh));
  const [note, setNote] = useState(view.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showForm = !view.future && (editing || view.kwh === null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/rooms/${roomId}/meter`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: view.date, kwh, note }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setError(body.error ?? "บันทึกไม่สำเร็จ");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`ลบข้อมูลของวันที่ ${view.day}?`)) return;
    setBusy(true);
    await fetch(`/api/rooms/${roomId}/meter?date=${view.date}`, { method: "DELETE" });
    setBusy(false);
    setKwh("");
    setNote("");
    setEditing(false);
    router.refresh();
  }

  return (
    <li className={`grid gap-2 px-4 py-3 sm:grid-cols-[5.5rem_1fr] sm:items-center ${view.future ? "bg-sand-50/60 text-sand-400" : ""}`}>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold tabular-nums">{view.day}</span>
        <span className="text-sm text-sand-500">{view.weekday}</span>
      </div>

      {view.future ? (
        <span className="text-sm">-</span>
      ) : showForm ? (
        <form onSubmit={save} className="flex flex-wrap items-start gap-2">
          <div className="w-32">
            <input
              type="number" required min="0" step="0.001" inputMode="decimal" placeholder="kWh"
              aria-label={`หน่วยไฟวันที่ ${view.day}`} value={kwh} onChange={(event) => setKwh(event.target.value)} className={input}
            />
          </div>
          <div className="min-w-40 flex-1">
            <input
              type="text" maxLength={200} placeholder="หมายเหตุ (ถ้ามี)"
              aria-label={`หมายเหตุวันที่ ${view.day}`} value={note} onChange={(event) => setNote(event.target.value)} className={input}
            />
          </div>
          <button type="submit" disabled={busy} className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-semibold text-brand-950 hover:bg-brand-400 disabled:opacity-60">
            {busy ? "..." : "บันทึก"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(false); setKwh(String(view.kwh ?? "")); setNote(view.note ?? ""); setError(null); }} className="px-2 py-2 text-sm font-semibold text-sand-600 hover:underline">
              ยกเลิก
            </button>
          )}
          {!view.hasRow && <span className="self-center text-xs text-sand-400">ยังไม่มีข้อมูล</span>}
          {error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-lg font-semibold tabular-nums">{kwhText(view.kwh!)} <span className="text-sm font-normal text-sand-500">kWh</span></span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${view.source === "manual" ? "bg-sand-100 text-sand-700" : "bg-green-100 text-green-700"}`}>
            {view.source === "manual" ? "กรอกเอง" : "มิเตอร์ Tuya"}
          </span>
          {view.note && <span className="text-sm text-sand-500">{view.note}</span>}
          <span className="ml-auto flex gap-3">
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-brand-700 hover:underline">แก้ไข</button>
            <button type="button" onClick={remove} disabled={busy} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-60">ลบ</button>
          </span>
        </div>
      )}
    </li>
  );
}
