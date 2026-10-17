import type { ChangeEvent } from "react";
import type { HomepageSettings } from "@/lib/homepage";
import ImageCropEditor from "./ImageCropEditor";
import { inputClass } from "./styles";

type Props = {
  settings: HomepageSettings;
  uploading: string;
  updateSetting: <K extends keyof HomepageSettings>(key: K, value: HomepageSettings[K]) => void;
  onUploadBanner: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function BannerSection({ settings, uploading, updateSetting, onUploadBanner }: Props) {
  return (
          <section className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Banner</h2>
              <p className="mt-1 text-sm text-sand-500">ข้อความหลักและรูปภาพส่วนบนของหน้าเว็บ</p>
            </div>
            <div className="grid gap-7 lg:grid-cols-2">
              <div className="space-y-5">
                <label className="block text-sm font-semibold">ข้อความป้าย
                  <input className={inputClass} value={settings.banner_badge} onChange={(e) => updateSetting("banner_badge", e.target.value)} required />
                </label>
                <label className="block text-sm font-semibold">หัวข้อหลัก
                  <input className={inputClass} value={settings.banner_title} onChange={(e) => updateSetting("banner_title", e.target.value)} required />
                </label>
                <label className="block text-sm font-semibold">ข้อความเน้น
                  <input className={inputClass} value={settings.banner_highlight} onChange={(e) => updateSetting("banner_highlight", e.target.value)} required />
                </label>
                <label className="block text-sm font-semibold">รายละเอียด
                  <textarea className={`${inputClass} min-h-28`} value={settings.banner_description} onChange={(e) => updateSetting("banner_description", e.target.value)} required />
                </label>
              </div>
              <div>
                <ImageCropEditor
                  alt="ตัวอย่างตำแหน่งรูป Banner"
                  src={settings.banner_image_url}
                  positionX={settings.banner_image_position_x}
                  positionY={settings.banner_image_position_y}
                  zoom={settings.banner_image_zoom}
                  onPositionXChange={(value) => updateSetting("banner_image_position_x", value)}
                  onPositionYChange={(value) => updateSetting("banner_image_position_y", value)}
                  onZoomChange={(value) => updateSetting("banner_image_zoom", value)}
                />
                <label className="mt-4 block cursor-pointer rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-center font-semibold text-brand-700 hover:bg-brand-100">
                  {uploading === "banner" ? "กำลังอัปโหลด..." : "เลือกรูป Banner"}
                  <input type="file" accept="image/*,.heic,.heif" className="sr-only" disabled={Boolean(uploading)} onChange={onUploadBanner} />
                </label>
                {settings.banner_image_url && (
                  <button type="button" onClick={() => updateSetting("banner_image_url", null)} className="mt-3 w-full text-sm font-semibold text-red-600 hover:underline">
                    เอารูป Banner ออก
                  </button>
                )}
              </div>
            </div>
          </section>
  );
}
