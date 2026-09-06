"use client";

import { useState } from "react";

type Props = {
  tenantId: string;
  linked: boolean;
};

export default function LineConnectionCard({ tenantId, linked }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateCode() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/line/link-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    const result = (await response.json()) as { code?: string; error?: string };
    setLoading(false);

    if (!response.ok || !result.code) {
      setError(result.error || "สร้างรหัสไม่สำเร็จ");
      return;
    }
    setCode(result.code);
  }

  return (
    <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
      <p className="font-semibold text-green-900">
        LINE: {linked ? "ผูกบัญชีแล้ว" : "ยังไม่ได้ผูกบัญชี"}
      </p>
      <p className="mt-1 text-sm text-green-800">
        สร้างรหัสแล้วให้ผู้เช่าส่งข้อความนี้เข้า LINE Official Account ภายใน 15 นาที
      </p>

      {code && (
        <div className="mt-3 rounded-lg bg-white p-3 text-center font-mono text-lg font-bold tracking-wide text-green-950">
          {code}
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={generateCode}
        disabled={loading}
        className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
      >
        {loading ? "กำลังสร้าง..." : linked ? "สร้างรหัสผูกใหม่" : "สร้างรหัสผูก LINE"}
      </button>
    </div>
  );
}
