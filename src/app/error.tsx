"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div
        role="alert"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      >
        <h1 className="text-2xl font-bold">เกิดข้อผิดพลาด</h1>
        <p className="mt-2 text-slate-500">
          ระบบทำงานไม่สำเร็จ กรุณาลองอีกครั้ง หากยังไม่หายให้แจ้งผู้ดูแลระบบ
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-400">รหัสอ้างอิง: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
          >
            ลองอีกครั้ง
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    </main>
  );
}
