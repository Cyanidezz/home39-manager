"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const input = "rounded-lg border border-sand-300 bg-white px-3 py-2";

/** Pick a range of days (one day if only the first is filled): opens its month and totals the usage. */
export function MeterDatePicker({ min, max, from: initialFrom, to: initialTo }: { min: string; max: string; from: string; to: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  function apply(nextFrom: string, nextTo: string) {
    if (!nextFrom && !nextTo) return router.push("?");
    const first = nextFrom || nextTo;
    router.push(`?month=${first.slice(0, 7)}&from=${nextFrom || nextTo}&to=${nextTo || nextFrom}#day-${first}`);
  }

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); apply(from, to); }}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm font-medium shadow-sm"
    >
      ดูหน่วยไฟของวันที่
      <input type="date" min={min} max={max} value={from} onChange={(event) => setFrom(event.target.value)} aria-label="ตั้งแต่วันที่" className={input} />
      ถึง
      <input type="date" min={from || min} max={max} value={to} onChange={(event) => setTo(event.target.value)} aria-label="ถึงวันที่" className={input} />
      <button type="submit" disabled={!from && !to} className="rounded-lg bg-brand-300 px-4 py-2 font-semibold text-brand-950 hover:bg-brand-400 disabled:opacity-50">
        ดู
      </button>
      {(initialFrom || initialTo) && (
        <button type="button" onClick={() => { setFrom(""); setTo(""); apply("", ""); }} className="text-brand-700 hover:underline">
          ล้าง
        </button>
      )}
    </form>
  );
}
