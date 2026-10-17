import { requireUser } from "@/lib/data/session";
import { fetchPaymentSettings } from "@/lib/data/settings";
import PaymentSettingsForm from "./PaymentSettingsForm";
import PageHeader from "@/components/PageHeader";

export default async function PaymentSettingsPage() {
  const { supabase } = await requireUser();

  const { settings: initialSettings, error } = await fetchPaymentSettings(supabase);

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        width="3xl"
        back={{ href: "/dashboard", label: "กลับ Dashboard" }}
        title="ตั้งค่าบัญชีรับโอน"
        subtitle="ข้อมูลนี้จะแสดงในหน้าบิลลูกค้าที่ยังไม่ได้ชำระ"
      />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        <div className="max-w-xl rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
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
