import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentSettingsForm from "./PaymentSettingsForm";

const defaultSettings = {
  bank_name: "ธนาคารไทยพาณิชย์",
  bank_code: "SCB",
  account_name: "นางสาวพิรญาณ์ จันทร์งาม",
  account_number: "206-269288-7",
};

export default async function PaymentSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("payment_settings")
    .select("bank_name, bank_code, account_name, account_number")
    .eq("id", "default")
    .maybeSingle();

  const initialSettings = data
    ? {
        bank_name: data.bank_name,
        bank_code: data.bank_code || "",
        account_name: data.account_name,
        account_number: data.account_number,
      }
    : defaultSettings;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-600 hover:text-black"
        >
          ← กลับ Dashboard
        </Link>

        <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">ตั้งค่าบัญชีรับโอน</h1>
          <p className="mt-2 text-sm text-gray-500">
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
