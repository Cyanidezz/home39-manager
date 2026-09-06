"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  tenantId: string;
  tenantName: string;
  initialNoticeDate: string | null;
  initialMoveOutDate: string | null;
};

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function addOneMonth(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const result = new Date(Date.UTC(year, month, Math.min(day, lastDay)));
  return result.toISOString().slice(0, 10);
}

function formatThaiMonth(value: string) {
  if (!value) return "-";
  const [year, month] = value.split("-").map(Number);
  return `${thaiMonths[month - 1]} ${year + 543}`;
}

function getToday() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default function EndTenancyButton({
  tenantId,
  tenantName,
  initialNoticeDate,
  initialMoveOutDate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [noticeDate, setNoticeDate] = useState(initialNoticeDate || "");
  const [moveOutDate, setMoveOutDate] = useState(initialMoveOutDate || "");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [actualMoveOutDate, setActualMoveOutDate] = useState(getToday);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const minimumMoveOutDate = useMemo(() => addOneMonth(noticeDate), [noticeDate]);

  async function save() {
    setError("");
    if (!noticeDate || !moveOutDate) {
      setError("กรุณากรอกวันที่ให้ครบ");
      return;
    }
    if (moveOutDate < minimumMoveOutDate) {
      setError("วันที่ย้ายออกต้องห่างจากวันที่แจ้งอย่างน้อย 1 เดือน");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/move-out`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noticeDate, moveOutDate }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(result.error || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  async function cancelMoveOut() {
    const confirmed = window.confirm(
      "ยืนยันยกเลิกการย้ายออก? สถานะห้องจะกลับเป็นมีผู้เช่า"
    );
    if (!confirmed) return;

    setError("");
    setCancelling(true);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/move-out`, {
        method: "DELETE",
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(result.error || "ยกเลิกการย้ายออกไม่สำเร็จ");
        return;
      }

      setNoticeDate("");
      setMoveOutDate("");
      router.refresh();
    } catch {
      setError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setCancelling(false);
    }
  }

  async function completeMoveOut() {
    setError("");
    if (!actualMoveOutDate) {
      setError("กรุณากรอกวันที่ย้ายออกจริง");
      return;
    }

    setCompleting(true);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/move-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moveOutDate: actualMoveOutDate }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        roomCode?: string;
      };

      if (!response.ok || !result.roomCode) {
        setError(result.error || "บันทึกผู้เช่าย้ายออกไม่สำเร็จ");
        return;
      }

      setCompleteOpen(false);
      router.push(`/rooms/${result.roomCode}`);
      router.refresh();
    } catch {
      setError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={cancelling || completing}
          className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {initialMoveOutDate ? "แก้ไขข้อมูลย้ายออก" : "สิ้นสุดสัญญาเช่า"}
        </button>

        {initialMoveOutDate && (
          <>
            <button
              type="button"
              onClick={cancelMoveOut}
              disabled={loading || cancelling || completing}
              className="rounded-lg border border-red-300 px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? "กำลังยกเลิก..." : "ยกเลิกการย้ายออก"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setCompleteOpen(true);
              }}
              disabled={loading || cancelling || completing}
              className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
            >
              ผู้เช่าย้ายออกแล้ว
            </button>
          </>
        )}
      </div>

      {error && !open && !completeOpen && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {completeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">ยืนยันผู้เช่าย้ายออกแล้ว</h3>
                <p className="mt-1 text-sm text-gray-500">{tenantName}</p>
              </div>
              <button
                type="button"
                onClick={() => setCompleteOpen(false)}
                disabled={completing}
                className="text-2xl text-gray-400 hover:text-black disabled:opacity-50"
                aria-label="ปิด"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block font-medium">
                วันที่ย้ายออกจริง *
              </label>
              <input
                type="date"
                value={actualMoveOutDate}
                onChange={(event) => setActualMoveOutDate(event.target.value)}
                className="w-full rounded-lg border px-4 py-3"
              />
              <p className="mt-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                หลังยืนยัน ผู้เช่าจะถูกปิดสถานะและห้องจะเปลี่ยนเป็นห้องว่าง
              </p>
              {error && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCompleteOpen(false)}
                disabled={completing}
                className="rounded-lg border px-5 py-3 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={completeMoveOut}
                disabled={completing}
                className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {completing ? "กำลังบันทึก..." : "ยืนยันย้ายออกแล้ว"}
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">บันทึกการสิ้นสุดสัญญาเช่า</h3>
                <p className="mt-1 text-sm text-gray-500">{tenantName}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-2xl text-gray-400 hover:text-black" aria-label="ปิด">×</button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block font-medium">วันที่ผู้เช่าแจ้งสิ้นสุดสัญญา *</label>
                <input type="date" value={noticeDate} onChange={(event) => {
                  const value = event.target.value;
                  setNoticeDate(value);
                  if (!moveOutDate || moveOutDate < addOneMonth(value)) setMoveOutDate(addOneMonth(value));
                }} className="w-full rounded-lg border px-4 py-3" />
              </div>
              <div>
                <label className="mb-2 block font-medium">วันที่ผู้เช่าแจ้งว่าจะย้ายออก *</label>
                <input type="date" min={minimumMoveOutDate} value={moveOutDate} onChange={(event) => setMoveOutDate(event.target.value)} className="w-full rounded-lg border px-4 py-3" />
                <p className="mt-2 text-sm text-gray-500">ต้องแจ้งล่วงหน้าอย่างน้อย 1 เดือน</p>
              </div>

              {noticeDate && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                  ค่าเช่าเดือน <strong>{formatThaiMonth(noticeDate)}</strong> จะเป็น 0 บาท เพราะใช้ค่าเช่าล่วงหน้าที่ชำระไว้ตอนเริ่มสัญญา ค่าน้ำ ค่าไฟ และรายการอื่นยังคิดตามจริง
                </div>
              )}
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} disabled={loading || cancelling} className="rounded-lg border px-5 py-3 disabled:opacity-50">ยกเลิก</button>
              <button type="button" onClick={save} disabled={loading || cancelling} className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
                {loading ? "กำลังบันทึก..." : "บันทึกการแจ้งย้ายออก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
