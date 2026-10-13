import type { HomepageSettings } from "@/lib/homepage";
import { inputClass } from "./styles";

type Props = {
  settings: HomepageSettings;
  updateSetting: <K extends keyof HomepageSettings>(key: K, value: HomepageSettings[K]) => void;
};

export default function ContactSection({ settings, updateSetting }: Props) {
  return (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">ข้อมูลติดต่อ</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-semibold">หัวข้อ
                <input className={inputClass} value={settings.contact_title} onChange={(e) => updateSetting("contact_title", e.target.value)} required />
              </label>
              <label className="block text-sm font-semibold">รายละเอียด
                <input className={inputClass} value={settings.contact_description} onChange={(e) => updateSetting("contact_description", e.target.value)} required />
              </label>
              <label className="block text-sm font-semibold">Facebook URL
                <input type="url" className={inputClass} value={settings.facebook_url} onChange={(e) => updateSetting("facebook_url", e.target.value)} required />
              </label>
              <label className="block text-sm font-semibold">LINE ID
                <input className={inputClass} value={settings.line_id} onChange={(e) => updateSetting("line_id", e.target.value)} required />
              </label>
              <label className="block text-sm font-semibold">LINE URL
                <input type="url" className={inputClass} value={settings.line_url} onChange={(e) => updateSetting("line_url", e.target.value)} required />
              </label>
              <label className="block text-sm font-semibold">เบอร์โทรหลัก
                <input className={inputClass} value={settings.phone_primary} onChange={(e) => updateSetting("phone_primary", e.target.value)} required />
              </label>
              <label className="block text-sm font-semibold">เบอร์โทรสำรอง
                <input className={inputClass} value={settings.phone_secondary} onChange={(e) => updateSetting("phone_secondary", e.target.value)} required />
              </label>
            </div>
          </section>
  );
}
