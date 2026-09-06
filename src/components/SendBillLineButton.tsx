"use client";

import { useState } from "react";

export default function SendBillLineButton({ billId }: { billId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send() {
    setState("loading");
    setMessage("");

    try {
      const response = await fetch(`/api/line/bills/${billId}/send`, {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "ส่ง LINE ไม่สำเร็จ");
      }

      setState("success");
      setMessage("ส่งบิลทาง LINE แล้ว");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof DOMException && error.name === "TimeoutError"
          ? "LINE ตอบช้าเกินไป กรุณาลองใหม่"
          : error instanceof Error
            ? error.message
            : "ส่ง LINE ไม่สำเร็จ"
      );
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={send}
        disabled={state === "loading"}
        className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {state === "loading" ? "กำลังส่ง..." : "ส่งบิลทาง LINE"}
      </button>
      {message && <p className={`mt-2 text-sm ${state === "error" ? "text-red-600" : "text-green-700"}`}>{message}</p>}
    </div>
  );
}
