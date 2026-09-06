"use client";

import { useState } from "react";

type Props = {
  billId: string;
  roomCode: string;
  currentStatus: string;
  updateBillStatus: (formData: FormData) => void | Promise<void>;
};

function getStatusText(status: string) {
  switch (status) {
    case "paid":
      return "ชำระแล้ว";

    case "unpaid":
      return "ยังไม่ชำระ";

    case "overdue":
      return "เกินกำหนด";

    case "slip_submitted":
      return "ส่งสลิปแล้ว";

    case "verifying":
      return "กำลังตรวจสอบ";

    case "rejected":
      return "สลิปไม่ผ่าน";

    case "draft":
      return "ฉบับร่าง";

    default:
      return status;
  }
}

export default function StatusEditor({
  billId,
  roomCode,
  currentStatus,
  updateBillStatus,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ปุ่มเปิด */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
      >
        ✏️ แก้ไขสถานะบิล
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* พื้นหลัง */}
          <button
            type="button"
            aria-label="ปิด"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          {/* กล่อง */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  ✏️ แก้ไขสถานะบิล
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  ห้อง {roomCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-black"
              >
                ✕
              </button>
            </div>

            <form action={updateBillStatus}>
              <input
                type="hidden"
                name="billId"
                value={billId}
              />

              <input
                type="hidden"
                name="roomCode"
                value={roomCode}
              />

              <div className="space-y-5 px-6 py-6">
                {/* สถานะปัจจุบัน */}
                <div className="rounded-xl bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-500">
                    สถานะปัจจุบัน
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {getStatusText(currentStatus)}
                  </p>
                </div>

                {/* สถานะใหม่ */}
                <div>
                  <label
                    htmlFor="newStatus"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    สถานะใหม่
                  </label>

                  <select
                    id="newStatus"
                    name="newStatus"
                    defaultValue={currentStatus}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-black"
                  >
                    <option value="unpaid">
                      ยังไม่ชำระ
                    </option>

                    <option value="paid">
                      ชำระแล้ว
                    </option>

                    <option value="overdue">
                      เกินกำหนด
                    </option>

                    <option value="slip_submitted">
                      ส่งสลิปแล้ว
                    </option>

                    <option value="verifying">
                      กำลังตรวจสอบ
                    </option>

                    <option value="rejected">
                      สลิปไม่ผ่าน
                    </option>

                    <option value="draft">
                      ฉบับร่าง
                    </option>
                  </select>
                </div>

                {/* เหตุผล */}
                <div>
                  <label
                    htmlFor="reason"
                    className="mb-2 block text-sm font-semibold text-gray-700"
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
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none transition placeholder:text-gray-400 focus:border-black"
                  />

                  <p className="mt-2 text-xs text-gray-400">
                    เหตุผลนี้จะถูกบันทึกไว้ในประวัติการเปลี่ยนสถานะ
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-black px-5 py-2.5 font-semibold text-white transition hover:bg-gray-800"
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