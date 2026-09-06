"use client";

import { useMemo, useState } from "react";

type Props = {
  billId: string;
  roomCode: string;
  currentStatus: string;
  updateBillStatus: (formData: FormData) => void | Promise<void>;
};

const statuses = [
  ["unpaid", "ยังไม่ชำระ"],
  ["paid", "ชำระแล้ว"],
  ["overdue", "เกินกำหนด"],
  ["slip_submitted", "ส่งสลิปแล้ว"],
  ["verifying", "กำลังตรวจสอบ"],
  ["rejected", "สลิปไม่ผ่าน"],
  ["draft", "ฉบับร่าง"],
] as const;

function getStatusText(status: string) {
  return statuses.find(([value]) => value === status)?.[1] || status;
}

export default function StatusEditor({
  billId,
  roomCode,
  currentStatus,
  updateBillStatus,
}: Props) {
  const [open, setOpen] = useState(false);
  const availableStatuses = useMemo(
    () => statuses.filter(([value]) => value !== currentStatus),
    [currentStatus]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-slate-500 underline decoration-gray-300 underline-offset-4 transition hover:text-slate-900"
      >
        แก้ไขสถานะบิล
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="ปิด"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-blue-600/40"
          />

          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">✏️ แก้ไขสถานะบิล</h2>
                <p className="mt-1 text-sm text-slate-500">ห้อง {roomCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-blue-700"
              >
                ✕
              </button>
            </div>

            <form action={updateBillStatus}>
              <input type="hidden" name="billId" value={billId} />
              <input type="hidden" name="roomCode" value={roomCode} />

              <div className="space-y-5 px-6 py-6">
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-500">สถานะปัจจุบัน</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {getStatusText(currentStatus)}
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="newStatus"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    สถานะใหม่
                  </label>
                  <select
                    id="newStatus"
                    name="newStatus"
                    defaultValue={availableStatuses[0]?.[0]}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-black"
                  >
                    {availableStatuses.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reason"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    เหตุผลในการแก้ไข
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <textarea
                    id="reason"
                    name="reason"
                    required
                    rows={4}
                    placeholder="เช่น กดบันทึกชำระผิด, ตรวจสอบยอดใหม่, ลูกค้าแจ้งแก้ไข"
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-black"
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    เหตุผลนี้จะถูกบันทึกไว้ในประวัติการเปลี่ยนสถานะ
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
                >
                  ยืนยันการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
