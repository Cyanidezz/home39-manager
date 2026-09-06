"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { HomepageRoom, HomepageSettings } from "@/lib/homepage";

type Props = {
  initialSettings: HomepageSettings;
  initialRooms: HomepageRoom[];
};

type Message = { type: "success" | "error"; text: string } | null;

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function ImagePreview({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        ยังไม่มีรูปภาพ
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[16/9] w-full rounded-xl border border-slate-200 object-cover"
    />
  );
}

export default function HomepageManager({ initialSettings, initialRooms }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [settings, setSettings] = useState(initialSettings);
  const [rooms, setRooms] = useState(initialRooms);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState<Message>(null);

  function updateSetting<K extends keyof HomepageSettings>(
    key: K,
    value: HomepageSettings[K]
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateRoom(roomCode: string, changes: Partial<HomepageRoom>) {
    setRooms((current) =>
      current.map((room) =>
        room.room_code === roomCode ? { ...room, ...changes } : room
      )
    );
  }

  async function uploadImage(file: File, folder: string) {
    if (!file.type.startsWith("image/")) throw new Error("กรุณาเลือกไฟล์รูปภาพ");
    if (file.size > 10 * 1024 * 1024) throw new Error("รูปภาพต้องมีขนาดไม่เกิน 10 MB");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("homepage").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) throw error;
    return supabase.storage.from("homepage").getPublicUrl(path).data.publicUrl;
  }

  async function uploadBanner(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading("banner");
    setMessage(null);
    try {
      const url = await uploadImage(file, "banner");
      updateSetting("banner_image_url", url);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ" });
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  async function uploadRoomImages(
    roomCode: string,
    event: ChangeEvent<HTMLInputElement>,
    cover: boolean
  ) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const uploadKey = `${roomCode}-${cover ? "cover" : "gallery"}`;
    setUploading(uploadKey);
    setMessage(null);

    try {
      const urls = await Promise.all(
        files.map((file) => uploadImage(file, `rooms/${roomCode.toLowerCase()}`))
      );
      const room = rooms.find((item) => item.room_code === roomCode)!;
      if (cover) {
        updateRoom(roomCode, { cover_image_url: urls[0] });
      } else {
        updateRoom(roomCode, { image_urls: [...room.image_urls, ...urls] });
      }
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ" });
    } finally {
      setUploading("");
      event.target.value = "";
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("homepage_settings").upsert({
      ...settings,
      id: "default",
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (error) {
      setMessage({ type: "error", text: `บันทึกไม่สำเร็จ: ${error.message}` });
      return;
    }

    setMessage({ type: "success", text: "บันทึก Banner แผนที่ และข้อมูลติดต่อแล้ว" });
    router.refresh();
  }

  async function saveRoom(room: HomepageRoom) {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from("homepage_rooms").upsert({
      ...room,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: `บันทึกห้อง ${room.room_code} ไม่สำเร็จ: ${error.message}` });
      return;
    }
    setMessage({ type: "success", text: `บันทึกข้อมูลห้อง ${room.room_code} แล้ว` });
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">จัดการ Homepage</h1>
            <p className="mt-2 text-slate-500">แก้ไขข้อความ รูปภาพ แผนที่ และช่องทางติดต่อหน้าแรก</p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
          >
            ดูหน้าเว็บไซต์ ↗
          </a>
        </div>

        {message && (
          <div
            role="status"
            className={`mb-6 rounded-xl border px-4 py-3 ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={saveSettings} className="space-y-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Banner</h2>
              <p className="mt-1 text-sm text-slate-500">ข้อความหลักและรูปภาพส่วนบนของหน้าเว็บ</p>
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
                <ImagePreview src={settings.banner_image_url} alt="ตัวอย่าง Banner" />
                <label className="mt-4 block cursor-pointer rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center font-semibold text-blue-700 hover:bg-blue-100">
                  {uploading === "banner" ? "กำลังอัปโหลด..." : "เลือกรูป Banner"}
                  <input type="file" accept="image/*" className="sr-only" disabled={Boolean(uploading)} onChange={uploadBanner} />
                </label>
                {settings.banner_image_url && (
                  <button type="button" onClick={() => updateSetting("banner_image_url", null)} className="mt-3 w-full text-sm font-semibold text-red-600 hover:underline">
                    เอารูป Banner ออก
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
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
              <label className="block text-sm font-semibold">สถานที่ใกล้เคียง
                <input className={inputClass} value={settings.nearby_place} onChange={(e) => updateSetting("nearby_place", e.target.value)} required />
              </label>
              <label className="block text-sm font-semibold">รายละเอียดสถานที่
                <input className={inputClass} value={settings.nearby_description} onChange={(e) => updateSetting("nearby_description", e.target.value)} required />
              </label>
            </div>
          </section>

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

          <div className="flex justify-end">
            <button type="submit" disabled={saving || Boolean(uploading)} className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึก Banner แผนที่ และข้อมูลติดต่อ"}
            </button>
          </div>
        </form>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold">ข้อมูลและรูปภาพห้องพัก</h2>
            <p className="mt-1 text-sm text-slate-500">รูปหน้าปกจะแสดงบนการ์ด และรูปเพิ่มเติมจะแสดงเมื่อเปิดดูห้อง</p>
          </div>
          <div className="space-y-8">
            {rooms.map((room) => (
              <article key={room.room_code} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-bold">ห้อง {room.room_code}</h3>
                  <button type="button" disabled={saving || Boolean(uploading)} onClick={() => saveRoom(room)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    บันทึกห้อง {room.room_code}
                  </button>
                </div>
                <div className="mt-5 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    <label className="block text-sm font-semibold">ชื่อห้อง
                      <input className={inputClass} value={room.title} onChange={(e) => updateRoom(room.room_code, { title: e.target.value })} required />
                    </label>
                    <label className="block text-sm font-semibold">รายละเอียดห้อง
                      <textarea className={`${inputClass} min-h-28`} value={room.description} onChange={(e) => updateRoom(room.room_code, { description: e.target.value })} required />
                    </label>
                  </div>
                  <div>
                    <ImagePreview src={room.cover_image_url} alt={`รูปหน้าปกห้อง ${room.room_code}`} />
                    <label className="mt-3 block cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-sm font-semibold text-blue-700 hover:bg-blue-100">
                      {uploading === `${room.room_code}-cover` ? "กำลังอัปโหลด..." : "เลือกรูปหน้าปก"}
                      <input type="file" accept="image/*" className="sr-only" disabled={Boolean(uploading)} onChange={(event) => uploadRoomImages(room.room_code, event, true)} />
                    </label>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">รูปเพิ่มเติม ({room.image_urls.length} รูป)</p>
                    <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      {uploading === `${room.room_code}-gallery` ? "กำลังอัปโหลด..." : "+ เพิ่มรูปภาพ"}
                      <input type="file" accept="image/*" multiple className="sr-only" disabled={Boolean(uploading)} onChange={(event) => uploadRoomImages(room.room_code, event, false)} />
                    </label>
                  </div>
                  {room.image_urls.length ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {room.image_urls.map((url, index) => (
                        <div key={url} className="relative">
                          <img src={url} alt={`ห้อง ${room.room_code} รูปที่ ${index + 1}`} className="aspect-[4/3] w-full rounded-lg object-cover" />
                          <button type="button" aria-label={`เอารูปที่ ${index + 1} ออก`} onClick={() => updateRoom(room.room_code, { image_urls: room.image_urls.filter((item) => item !== url) })} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/75 text-white hover:bg-red-600">×</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">ยังไม่มีรูปเพิ่มเติม</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
