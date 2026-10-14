import Link from "next/link";
import { requireUser } from "@/lib/data/session";
import { fetchPaymentSettings } from "@/lib/data/settings";
import PaymentSettingsForm from "./PaymentSettingsForm";

export default async function PaymentSettingsPage() {
  const { supabase } = await requireUser();

  const { settings: initialSettings, error } = await fetchPaymentSettings(supabase);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          ← กลับ Dashboard
        </Link>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">ตั้งค่าบัญชีรับโอน</h1>
          <p className="mt-2 text-sm text-slate-500">
            ข้อมูลนี้จะแสดงในหน้าบิลลูกค้าที่ยังไม่ได้ชำระ
          </p>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              ไม่สามารถโหลดข้อมูลเดิมได้: {error.message}
            </div>
          )}

          <PaymentSettingsForm initialSettings={initialSettings} />
        </div>
      </div>
    </main>
  );
}
