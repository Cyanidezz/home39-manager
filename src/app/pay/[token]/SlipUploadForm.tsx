"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
};

export default function SlipUploadForm({ token }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.set("slip", file);

    try {
      const response = await fetch(`/api/pay/${token}/slip`, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "ส่งสลิปไม่สำเร็จ");
      }

      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "ส่งสลิปไม่สำเร็จ");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t bg-white px-6 py-6">
      <h2 className="font-bold text-slate-900">ส่งหลักฐานการโอนเงิน</h2>
      <p className="mt-1 text-sm text-slate-500">รองรับ JPG, PNG, WebP หรือ PDF ขนาดไม่เกิน 8 MB</p>

      <label className="mt-4 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
        <span className="block font-medium text-slate-700">
          {file ? file.name : "แตะเพื่อเลือกไฟล์สลิป"}
        </span>
        <input
          type="file"
          name="slip"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>

      {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={!file || loading}
        className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "กำลังส่งสลิป..." : "ส่งสลิปให้ผู้ดูแลตรวจสอบ"}
      </button>
    </form>
  );
}
