"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  billId: string;
  roomCode: string;
  billLabel: string;
};

export default function DeleteBillButton({ billId, roomCode, billLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function deleteBill() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/bills/${billId}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "ลบบิลไม่สำเร็จ");

      router.push(`/rooms/${roomCode}/bills`);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ลบบิลไม่สำเร็จ");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-red-200 bg-white px-5 py-3 font-medium text-red-700 transition hover:bg-red-50"
      >
        ลบบิล
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="ปิดหน้าต่างยืนยัน"
            onClick={() => !loading && setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-bill-title" className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="delete-bill-title" className="text-xl font-bold text-gray-950">ยืนยันการลบบิล</h2>
            <p className="mt-3 text-gray-600">
              ต้องการลบบิล <strong>{billLabel}</strong> ใช่หรือไม่?
              รายการค่าใช้จ่าย ประวัติสถานะ และสลิปของบิลนี้จะถูกลบด้วย
            </p>
            <p className="mt-2 text-sm font-medium text-red-700">การลบนี้ไม่สามารถย้อนกลับได้</p>
            {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={loading} onClick={() => setOpen(false)} className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                ยกเลิก
              </button>
              <button type="button" disabled={loading} onClick={deleteBill} className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {loading ? "กำลังลบ..." : "ยืนยันลบบิล"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
