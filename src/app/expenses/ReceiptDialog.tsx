"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";
import { receiptUrl } from "@/lib/expenseReceipt";
import { useModal } from "@/lib/useModal";

/** Popup with the receipt photo of an expense (a private file, opened through a short-lived link). */
export default function ReceiptDialog({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const dialogRef = useModal<HTMLDivElement>(onClose);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    receiptUrl(createClient(), path).then((signed) => {
      if (!active) return;
      if (signed) setUrl(signed);
      else setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [path]);

  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-sand-950/80 p-3 sm:p-6" onMouseDown={closeOnBackdrop}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`หลักฐาน ${title}`} tabIndex={-1} className="relative flex max-h-full w-full max-w-3xl flex-col outline-none">
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="absolute -top-1 right-0 z-10 flex h-10 w-10 -translate-y-full items-center justify-center rounded-full bg-white/90 text-brand-900 hover:bg-white sm:translate-y-0"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
        <div className="flex min-h-48 items-center justify-center overflow-auto rounded-2xl bg-white p-2">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- a signed, expiring storage link
            <img src={url} alt={`หลักฐาน ${title}`} className="max-h-[80vh] w-auto max-w-full object-contain" />
          ) : failed ? (
            <p className="p-8 text-sm text-red-600">เปิดรูปหลักฐานไม่สำเร็จ</p>
          ) : (
            <p className="p-8 text-sm text-sand-500">กำลังโหลดรูป...</p>
          )}
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-white">{title}</p>
      </div>
    </div>
  );
}
