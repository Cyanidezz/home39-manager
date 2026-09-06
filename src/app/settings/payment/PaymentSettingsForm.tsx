"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PaymentSettingsFormProps = {
  initialSettings: {
    bank_name: string;
    bank_code: string;
    account_name: string;
    account_number: string;
  };
};

export default function PaymentSettingsForm({
  initialSettings,
}: PaymentSettingsFormProps) {
  const supabase = createClient();
  const [bankName, setBankName] = useState(initialSettings.bank_name);
  const [bankCode, setBankCode] = useState(initialSettings.bank_code);
  const [accountName, setAccountName] = useState(initialSettings.account_name);
  const [accountNumber, setAccountNumber] = useState(initialSettings.account_number);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const values = {
      bank_name: bankName.trim(),
      bank_code: bankCode.trim().toUpperCase(),
      account_name: accountName.trim(),
      account_number: accountNumber.trim(),
    };

    if (!values.bank_name || !values.account_name || !values.account_number) {
      setError("กรุณากรอกชื่อธนาคาร ชื่อบัญชี และเลขที่บัญชีให้ครบ");
      setSaving(false);
      return;
    }

    const { error: saveError } = await supabase
      .from("payment_settings")
      .upsert(
        {
          id: "default",
          ...values,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setMessage("บันทึกข้อมูลบัญชีรับโอนเรียบร้อยแล้ว");
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium">ชื่อธนาคาร</label>
        <input
          value={bankName}
          onChange={(event) => setBankName(event.target.value)}
          required
          className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600"
          placeholder="ธนาคารไทยพาณิชย์"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">ชื่อย่อธนาคาร</label>
        <input
          value={bankCode}
          onChange={(event) => setBankCode(event.target.value)}
          className="w-full rounded-lg border px-4 py-3 uppercase outline-none focus:ring-2 focus:ring-purple-600"
          placeholder="SCB"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">ชื่อบัญชี</label>
        <input
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
          required
          className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600"
          placeholder="ชื่อเจ้าของบัญชี"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">เลขที่บัญชี</label>
        <input
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
          required
          inputMode="numeric"
          className="w-full rounded-lg border px-4 py-3 text-lg font-semibold tracking-wide outline-none focus:ring-2 focus:ring-purple-600"
          placeholder="000-000000-0"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-purple-700 py-3 font-medium text-white transition hover:bg-purple-800 disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลบัญชี"}
      </button>
    </form>
  );
}
