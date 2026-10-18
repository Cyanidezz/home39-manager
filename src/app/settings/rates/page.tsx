import { requireUser } from "@/lib/data/session";
import { fetchBillingRates } from "@/lib/data/settings";
import PageHeader from "@/components/PageHeader";
import RatesForm from "./RatesForm";

export default async function RatesSettingsPage() {
  const { supabase } = await requireUser();
  const rates = await fetchBillingRates(supabase);

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        width="3xl"
        back={{ href: "/dashboard", label: "กลับ Dashboard" }}
        title="อัตราค่าน้ำ / ค่าไฟ"
        subtitle="ใช้อัตราเดียวกันทุกห้อง"
      />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8">
        <div className="max-w-xl rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
          <RatesForm initialRates={rates} />
        </div>
      </div>
    </main>
  );
}
