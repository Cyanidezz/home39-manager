"use client";

import { useEffect, useState } from "react";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

type Props = {
  slipUrl: string;
  previewUrl: string | null;
  fileName: string;
  billId: string;
  roomCode: string;
  isPaid: boolean;
  canReject: boolean;
  contentType: string;
  markBillAsPaid: (formData: FormData) => void | Promise<void>;
  rejectBillSlip: (formData: FormData) => void | Promise<void>;
};

export default function SlipViewer({
  slipUrl,
  previewUrl,
  fileName,
  billId,
  roomCode,
  isPaid,
  canReject,
  contentType,
  markBillAsPaid,
  rejectBillSlip,
}: Props) {
  const [open, setOpen] = useState(false);
  const [imagePreviewFailed, setImagePreviewFailed] = useState(false);
  const isHeic = contentType === "image/heic" || contentType === "image/heif";
  const imageUrl = isHeic
    ? previewUrl || `/api/bills/${billId}/slip-preview`
    : slipUrl;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-brand-300 px-5 py-3 font-semibold text-brand-950 hover:bg-brand-400"
      >
        เปิดดูสลิป
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="ปิดหน้าต่างดูสลิป"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-sand-950/45"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="slip-dialog-title"
            className="relative z-10 flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <div className="min-w-0">
                <h2 id="slip-dialog-title" className="text-lg font-bold">ตรวจสอบสลิป</h2>
                <p className="truncate text-sm text-sand-500">{fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ปิด"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-sand-500 hover:bg-sand-100 hover:text-brand-700"
              >
                ✕
              </button>
            </header>

            <div className="min-h-0 flex-1 bg-sand-100 p-2 sm:p-4">
              {contentType.startsWith("image/") && !imagePreviewFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={`สลิป ${fileName}`}
                  onError={() => setImagePreviewFailed(true)}
                  className="h-full w-full object-contain"
                />
              ) : contentType.startsWith("image/") ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg bg-white p-6 text-center text-sand-700">
                  <p className="font-semibold">ไม่สามารถแสดงตัวอย่างภาพนี้ได้</p>
                  <p className="text-sm text-sand-500">ดาวน์โหลดไฟล์ต้นฉบับเพื่อตรวจสอบสลิป</p>
                  <a href={slipUrl} download={fileName} className="rounded-lg bg-brand-300 px-4 py-2 font-semibold text-brand-950 hover:bg-brand-400">
                    ดาวน์โหลดไฟล์สลิป
                  </a>
                </div>
              ) : (
                <iframe
                  src={slipUrl}
                  title={`สลิป ${fileName}`}
                  className="h-full w-full rounded-lg bg-white"
                />
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
              <a
                href={slipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                เปิดไฟล์ในแท็บใหม่
              </a>
              <a href={slipUrl} download={fileName} className="text-sm font-medium text-brand-700 hover:underline">
                ดาวน์โหลดไฟล์ต้นฉบับ
              </a>

              {isPaid ? (
                <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                  ยืนยันชำระเงินแล้ว
                </span>
              ) : (
                <div className="flex flex-wrap justify-end gap-3">
                  {canReject && (
                    <form action={rejectBillSlip}>
                      <input type="hidden" name="billId" value={billId} />
                      <input type="hidden" name="roomCode" value={roomCode} />
                      <ConfirmSubmitButton
                        confirmMessage="ยืนยันว่าสลิปไม่ถูกต้อง? ระบบจะแจ้งผู้เช่าทาง LINE ให้ส่งสลิปใหม่"
                        className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
                      >
                        สลิปไม่ถูกต้อง
                      </ConfirmSubmitButton>
                    </form>
                  )}
                  <form action={markBillAsPaid}>
                    <input type="hidden" name="billId" value={billId} />
                    <input type="hidden" name="roomCode" value={roomCode} />
                    <ConfirmSubmitButton
                      confirmMessage="ยืนยันว่าได้รับเงินแล้วและบันทึกเป็นชำระแล้ว? ระบบจะแจ้งผู้เช่าทาง LINE"
                      className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                    >
                      ยืนยันสลิปและบันทึกชำระเงิน
                    </ConfirmSubmitButton>
                  </form>
                </div>
              )}
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
