"use client";

import { useRouter } from "next/navigation";

/** Jump to any day: opens its month and highlights the day. */
export function MeterDatePicker({ min, max, value }: { min: string; max: string; value: string }) {
  const router = useRouter();

  function choose(date: string) {
    if (!date) return router.push("?");
    router.push(`?month=${date.slice(0, 7)}&date=${date}#day-${date}`);
  }

  return (
    <label className="flex flex-wrap items-center gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm font-medium shadow-sm">
      ดูหน่วยไฟของวันที่
      <input
        type="date"
        min={min}
        max={max}
        value={value}
        onChange={(event) => choose(event.target.value)}
        className="rounded-lg border border-sand-300 bg-white px-3 py-2"
      />
      {value && (
        <button type="button" onClick={() => choose("")} className="text-brand-700 hover:underline">
          ล้าง
        </button>
      )}
    </label>
  );
}
