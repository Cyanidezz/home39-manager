"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, formatThaiDate } from "@/lib/format";
import { meterBillBlockText, type MeterBill, type MeterBillBlock } from "@/lib/meterBilling";
import { primaryButton, secondaryButton } from "../_components/InfoCard";

type Props = {
  roomId: string;
  roomCode: string;
  year: number;
  month: number;
  monthLabel: string;
  result: { ok: true; bill: MeterBill } | { ok: false; block: MeterBillBlock };
};

/** The month's bill worked out from the meter: review the numbers, then issue it. */
export default function MeterBillCard({ roomId, roomCode, year, month, monthLabel, result }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Months that are not finished, or already billed, only need a quiet note.
  if (!result.ok && (result.block.reason === "not-complete" || result.block.reason === "before-move-in")) {
    return result.block.reason === "not-complete" ? (
      <p className="rounded-2xl border border-dashed border-sand-300 px-4 py-3 text-sm text-sand-500">
        บิลค่าไฟของ {monthLabel} ออกได้เมื่อครบเดือน
      </p>
    ) : null;
  }

  async function issue() {
    if (!window.confirm(`ออกบิล${monthLabel} ห้อง ${roomCode} ตามยอดนี้?`)) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/rooms/${roomId}/meter/bill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBusy(false);
      return setError(body.error ?? "ออกบิลไม่สำเร็จ");
    }
    router.push(`/rooms/${body.roomCode}/bills/${body.billId}`);
    router.refresh();
  }

  const row = "flex justify-between gap-4 py-2 text-sm";

  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">บิลประจำเดือน {monthLabel}</h2>

      {!result.ok ? (
        <>
          <p className={`mt-2 text-sm ${result.block.reason === "exists" ? "text-green-700" : "text-orange-700"}`}>
            {meterBillBlockText(result.block)}
          </p>
          {result.block.reason === "missing-days" && (
            <p className="mt-1 text-sm text-sand-500">
              วันที่ขาด: {result.block.missing.map((date) => formatThaiDate(date)).join(", ")}
            </p>
          )}
          {result.block.reason === "exists" && (
            <Link href={`/rooms/${roomCode}/bills`} className={`${secondaryButton} mt-3`}>ดูประวัติบิล</Link>
          )}
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-sand-500">
            ข้อมูลหน่วยไฟครบ {result.bill.days} วัน ตรวจสอบยอดด้านล่างก่อนออกบิล
          </p>
          <dl className="mt-3 divide-y divide-sand-100">
            <div className={row}><dt className="text-sand-500">ค่าเช่าห้อง{result.bill.rentWaived ? " (หักค่าเช่าล่วงหน้าแล้ว)" : ""}</dt><dd className="font-semibold">{formatMoney(result.bill.rent)} บาท</dd></div>
            <div className={row}><dt className="text-sand-500">ค่าน้ำ ({result.bill.waterRate} บาท/คน)</dt><dd className="font-semibold">{formatMoney(result.bill.water)} บาท</dd></div>
            <div className={row}><dt className="text-sand-500">ค่าไฟ {result.bill.units.toLocaleString("th-TH")} หน่วย × {result.bill.electricityRate}</dt><dd className="font-semibold">{formatMoney(result.bill.electricity)} บาท</dd></div>
            <div className={row}><dt className="text-sand-500">มิเตอร์</dt><dd className="font-semibold">{result.bill.previousMeter} → {result.bill.currentMeter}</dd></div>
            <div className={row}><dt className="text-sand-500">กำหนดชำระ</dt><dd className="font-semibold">{formatThaiDate(result.bill.dueDate)}</dd></div>
            <div className="flex justify-between gap-4 pt-3"><dt className="font-semibold">ยอดรวม</dt><dd className="text-xl font-bold">{formatMoney(result.bill.total)} บาท</dd></div>
          </dl>
          {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={issue} disabled={busy} className={`${primaryButton} disabled:opacity-60`}>
              {busy ? "กำลังออกบิล..." : "ออกบิลตามยอดนี้"}
            </button>
            <Link
              href={`/rooms/${roomCode}/bills/new?year=${year}&month=${month}&meter=${result.bill.currentMeter}`}
              className={secondaryButton}
            >
              ปรับรายละเอียดก่อนออกบิล
            </Link>
          </div>
          <p className="mt-3 text-xs text-sand-400">หลังออกบิลจะเปิดหน้าบิลให้ตรวจ และกดส่งทาง LINE ได้จากหน้านั้น</p>
        </>
      )}
    </section>
  );
}
