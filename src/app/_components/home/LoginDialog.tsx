"use client";

import type { FormEvent, MouseEvent } from "react";
import { useModal } from "@/lib/useModal";

type Props = {
  email: string;
  password: string;
  loading: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

const inputClass =
  "w-full rounded-xl border px-4 py-3 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export default function LoginDialog({ email, password, loading, error, onEmailChange, onPasswordChange, onSubmit, onClose }: Props) {
  const dialogRef = useModal<HTMLDivElement>(onClose);

  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sand-950/60 p-4"
      onMouseDown={closeOnBackdrop}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-dialog-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-sand-200 bg-white p-7 shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="login-dialog-title" className="text-2xl font-bold">เข้าสู่ระบบ</h2>
            <p className="mt-1 text-sm text-sand-500">สำหรับผู้ดูแล Home 39</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-sand-400 hover:bg-sand-100 hover:text-sand-700"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-medium">อีเมล</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              className={inputClass}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-medium">รหัสผ่าน</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              className={inputClass}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-300 py-3 font-semibold text-brand-950 hover:bg-brand-400 disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
