import type { FormEvent } from "react";

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

export default function LoginDialog({ email, password, loading, error, onEmailChange, onPasswordChange, onSubmit, onClose }: Props) {
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">เข้าสู่ระบบ</h2>
              <p className="mt-1 text-sm text-slate-500">สำหรับผู้ดูแล Home 39</p>
            </div>
            <button
              type="button"
              onClick={() => onClose()}
              className="text-2xl text-slate-400 hover:text-slate-700"
              aria-label="ปิด"
            >
              ×
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>
        </div>
      </div>
  );
}
