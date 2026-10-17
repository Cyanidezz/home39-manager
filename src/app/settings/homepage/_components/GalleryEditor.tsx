import type { ChangeEvent } from "react";
import HomepageImage from "@/components/HomepageImage";
import Icon from "@/components/Icon";
import { MAX_CAPTION_LENGTH, MAX_GALLERY_ITEMS, type GalleryItem } from "@/lib/gallery";
import type { HomepageSettings } from "@/lib/homepage";
import { moveItem } from "@/lib/list";
import { inputClass } from "./styles";

type Props = {
  settings: HomepageSettings;
  uploading: string;
  updateSetting: <K extends keyof HomepageSettings>(key: K, value: HomepageSettings[K]) => void;
  onUploadImages: (event: ChangeEvent<HTMLInputElement>) => void;
};

const iconButton =
  "flex h-9 w-9 items-center justify-center rounded-lg border border-sand-300 text-sand-600 hover:bg-brand-50 disabled:opacity-30 disabled:hover:bg-transparent";

export default function GalleryEditor({ settings, uploading, updateSetting, onUploadImages }: Props) {
  const items = settings.gallery_items;
  const setItems = (next: GalleryItem[]) => updateSetting("gallery_items", next);
  const updateItem = (index: number, changes: Partial<GalleryItem>) =>
    setItems(items.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  const full = items.length >= MAX_GALLERY_ITEMS;

  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6">
        <h2 className="text-xl font-bold">รูปบรรยากาศหอพัก</h2>
        <p className="mt-1 text-sm text-sand-500">
          รูปบรรยากาศหอพักและพื้นที่ส่วนกลาง แสดงต่อจากรายการห้องพักบนหน้าแรก
          (ถ้าไม่มีรูปเลย ส่วนนี้จะไม่แสดง) หัวข้อและรายละเอียดเว้นว่างได้ ถ้าไม่ต้องการแสดงข้อความ
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-semibold">หัวข้อ
          <input className={inputClass} value={settings.gallery_title} onChange={(e) => updateSetting("gallery_title", e.target.value)} />
        </label>
        <label className="block text-sm font-semibold">รายละเอียด
          <input className={inputClass} value={settings.gallery_description} onChange={(e) => updateSetting("gallery_description", e.target.value)} />
        </label>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">รูปภาพ ({items.length}/{MAX_GALLERY_ITEMS})</p>
        <label className={`rounded-lg border border-sand-300 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 ${full ? "pointer-events-none opacity-40" : "cursor-pointer"}`}>
          {uploading === "gallery" ? "กำลังอัปโหลด..." : "+ เพิ่มรูปภาพ"}
          <input type="file" accept="image/*,.heic,.heif" multiple className="sr-only" disabled={Boolean(uploading) || full} onChange={onUploadImages} />
        </label>
      </div>
      <p className="mt-1 text-xs text-sand-500">
        รูปแรกจะแสดงเป็นภาพใหญ่ (เมื่อมีตั้งแต่ 3 รูปขึ้นไป) ใช้ลูกศรเพื่อเรียงลำดับ แล้วกดบันทึกด้านล่าง
      </p>

      {items.length === 0 ? (
        <p className="mt-4 rounded-xl bg-sand-50 px-4 py-6 text-center text-sm text-sand-500">ยังไม่มีรูปในส่วนนี้</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item, index) => (
            <li key={`${item.url}-${index}`} className="flex flex-col gap-3 rounded-xl border border-sand-200 p-3 sm:flex-row sm:items-center">
              <HomepageImage
                src={item.url}
                alt={item.caption || `รูปที่ ${index + 1}`}
                className="h-24 w-full shrink-0 rounded-lg bg-sand-100 object-cover sm:w-36"
              />
              <div className="flex-1">
                <input
                  className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm"
                  value={item.caption}
                  maxLength={MAX_CAPTION_LENGTH}
                  placeholder="คำบรรยายใต้รูป เช่น ห้องครัวส่วนกลาง"
                  aria-label={`คำบรรยายรูปที่ ${index + 1}`}
                  onChange={(e) => updateItem(index, { caption: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" className={iconButton} disabled={index === 0} aria-label={`เลื่อนรูปที่ ${index + 1} ขึ้น`} onClick={() => setItems(moveItem(items, index, index - 1))}>
                  <Icon name="chevronLeft" className="h-4 w-4 rotate-90" />
                </button>
                <button type="button" className={iconButton} disabled={index === items.length - 1} aria-label={`เลื่อนรูปที่ ${index + 1} ลง`} onClick={() => setItems(moveItem(items, index, index + 1))}>
                  <Icon name="chevronRight" className="h-4 w-4 rotate-90" />
                </button>
                <button type="button" className={`${iconButton} hover:bg-red-50 hover:text-red-600`} aria-label={`เอารูปที่ ${index + 1} ออก`} onClick={() => setItems(items.filter((_, i) => i !== index))}>
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
