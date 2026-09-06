"use client";

import { useEffect, useState } from "react";

type Props = {
  slipUrl: string;
  fileName: string;
  billId: string;
  roomCode: string;
  isPaid: boolean;
  contentType: string;
  markBillAsPaid: (formData: FormData) => void | Promise<void>;
};

export default function SlipViewer({
  slipUrl,
  fileName,
  billId,
  roomCode,
  isPaid,
  contentType,
  markBillAsPaid,
}: Props) {
  const [open, setOpen] = useState(false);

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
        className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
      >
        เปิดดูสลิป
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="ปิดหน้าต่างดูสลิป"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-blue-600/70"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="slip-dialog-title"
            className="relative z-10 flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <div className="min-w-0">
                <h2 id="slip-dialog-title" className="text-lg font-bold">ตรวจสอบสลิป</h2>
                <p className="truncate text-sm text-slate-500">{fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ปิด"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100 hover:text-blue-700"
              >
                ✕
              </button>
            </header>

            <div className="min-h-0 flex-1 bg-slate-100 p-2 sm:p-4">
              {contentType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={slipUrl}
                  alt={`สลิป ${fileName}`}
                  className="h-full w-full object-contain"
                />
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
                className="text-sm font-medium text-blue-700 hover:underline"
              >
                เปิดไฟล์ในแท็บใหม่
              </a>

              {isPaid ? (
                <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                  ยืนยันชำระเงินแล้ว
                </span>
              ) : (
                <form action={markBillAsPaid}>
                  <input type="hidden" name="billId" value={billId} />
                  <input type="hidden" name="roomCode" value={roomCode} />
                  <button
                    type="submit"
                    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                  >
                    ยืนยันสลิปและบันทึกชำระเงิน
                  </button>
                </form>
              )}
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
