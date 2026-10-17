import type { HomepageSettings } from "@/lib/homepage";
import { inputClass } from "./styles";

type Props = {
  settings: HomepageSettings;
  updateSetting: <K extends keyof HomepageSettings>(key: K, value: HomepageSettings[K]) => void;
};

export default function LocationSection({ settings, updateSetting }: Props) {
  return (
          <section className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-bold">แผนที่และสถานที่ใกล้เคียง</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-semibold">หัวข้อ
                <input className={inputClass} value={settings.location_title} onChange={(e) => updateSetting("location_title", e.target.value)} required />
              </label>
              <label className="block text-sm font-semibold">ลิงก์ Google Maps
                <input type="url" className={inputClass} value={settings.map_url} onChange={(e) => updateSetting("map_url", e.target.value)} required />
              </label>
              <label className="block text-sm font-semibold md:col-span-2">รายละเอียด
                <textarea className={`${inputClass} min-h-24`} value={settings.location_description} onChange={(e) => updateSetting("location_description", e.target.value)} required />
              </label>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold">สถานที่ใกล้เคียง</p>
                  <button
                    type="button"
                    onClick={() => updateSetting("nearby_places", [...settings.nearby_places, ""])}
                    className="text-sm font-semibold text-brand-700 hover:underline"
                  >
                    + เพิ่มสถานที่
                  </button>
                </div>
                <p className="mt-1 text-xs text-sand-500">
                  แตะสถานที่บนหน้าแรกเพื่อดูเส้นทางจาก Home 39 ถ้าอยากกำหนดจุดปลายทางเอง (เช่น ประตูอีกด้าน) ให้เติม | แล้ววางลิงก์ Google Maps หรือพิกัด เช่น โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.) 400 ม. | https://maps.app.goo.gl/...
                </p>
                <div className="mt-2 space-y-3">
                  {settings.nearby_places.map((place, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        className={inputClass}
                        value={place}
                        onChange={(event) =>
                          updateSetting(
                            "nearby_places",
                            settings.nearby_places.map((current, placeIndex) =>
                              placeIndex === index ? event.target.value : current
                            )
                          )
                        }
                        aria-label={`สถานที่ใกล้เคียง ${index + 1}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateSetting(
                            "nearby_places",
                            settings.nearby_places.filter((_, placeIndex) => placeIndex !== index)
                          )
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl text-sand-500 hover:bg-red-50 hover:text-red-600"
                        aria-label={`ลบสถานที่ใกล้เคียง ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
  );
}
