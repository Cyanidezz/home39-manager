"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  roomId: string;
  roomCode: string;
  tenantId: string;
};

export default function ContractForm({
  roomId,
  roomCode,
  tenantId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError("กรุณาเลือกไฟล์สัญญา PDF");
      return;
    }

    if (file.type !== "application/pdf") {
      setError("รองรับเฉพาะไฟล์ PDF");
      return;
    }

    setLoading(true);
    setError("");

    const timestamp = Date.now();

    const filePath =
      `${roomCode}/${tenantId}/contract_${timestamp}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("contracts")
      .upload(filePath, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      setError(`Upload ไม่สำเร็จ: ${uploadError.message}`);
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("contracts")
      .insert({
        tenant_id: tenantId,
        room_id: roomId,
        contract_start: contractStart || null,
        contract_end: contractEnd || null,
        deposit_amount: depositAmount
          ? Number(depositAmount)
          : null,
        file_path: filePath,
        original_file_name: file.name,
        note: note || null,
      });

    if (dbError) {
      // ถ้าบันทึก DB ไม่สำเร็จ ให้ลบไฟล์ที่เพิ่ง Upload
      await supabase.storage
        .from("contracts")
        .remove([filePath]);

      setError(`บันทึกข้อมูลไม่สำเร็จ: ${dbError.message}`);
      setLoading(false);
      return;
    }

    router.push(`/rooms/${roomCode}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label className="mb-2 block font-medium">
          วันที่เริ่มสัญญา
        </label>

        <input
          type="date"
          value={contractStart}
          onChange={(e) => setContractStart(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          วันที่สิ้นสุดสัญญา
        </label>

        <input
          type="date"
          value={contractEnd}
          onChange={(e) => setContractEnd(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          เงินประกัน (บาท)
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
          placeholder="เช่น 5000"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          ไฟล์สัญญา PDF *
        </label>

        <input
          type="file"
          accept="application/pdf,.pdf"
          required
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
          }}
          className="w-full rounded-lg border px-4 py-3"
        />

        {file && (
          <p className="mt-2 text-sm text-gray-500">
            📎 {file.name}
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block font-medium">
          หมายเหตุ
        </label>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-24 w-full rounded-lg border px-4 py-3"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
        >
          {loading ? "กำลัง Upload..." : "บันทึกสัญญา"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-6 py-3"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}