"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeHttpUrl, type HomepageRoom, type HomepageSettings } from "@/lib/homepage";
import { uploadHomepageImage, uploadHomepageMedia } from "@/lib/homepageUpload";
import { clampPercent, clampZoom } from "@/lib/bannerCrop";
import { MAX_GALLERY_ITEMS, normalizeGalleryItems, type GalleryItem } from "@/lib/gallery";
import BannerSection from "./_components/BannerSection";
import LocationSection from "./_components/LocationSection";
import ContactSection from "./_components/ContactSection";
import GalleryEditor from "./_components/GalleryEditor";
import RoomsSection from "./_components/RoomsSection";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";


type Props = {
  initialSettings: HomepageSettings;
  initialRooms: HomepageRoom[];
};

type Message = { type: "success" | "error"; text: string } | null;

export default function HomepageManager({ initialSettings, initialRooms }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [settings, setSettings] = useState(initialSettings);
  const [rooms, setRooms] = useState(initialRooms);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [savedRooms, setSavedRooms] = useState(initialRooms);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState<Message>(null);

  const settingsDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const dirtyRooms = rooms.filter(
    (room) => JSON.stringify(room) !== JSON.stringify(savedRooms.find((item) => item.room_code === room.room_code))
  );
  const dirty = settingsDirty || dirtyRooms.length > 0;

  // Closing or reloading the tab with unsaved edits would silently drop them.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

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

  const uploadImage = (file: File, folder: string) =>
    uploadHomepageImage(supabase, file, folder);

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

  async function uploadGalleryImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading("gallery");
    setMessage(null);
    try {
      const urls = await Promise.all(files.map((file) => uploadImage(file, "gallery")));
      const added: GalleryItem[] = urls.map((url) => ({ url, caption: "" }));
      setSettings((current) => ({
        ...current,
        gallery_items: [...current.gallery_items, ...added].slice(0, MAX_GALLERY_ITEMS),
      }));
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
        files.map((file) =>
          cover
            ? uploadImage(file, `rooms/${roomCode.toLowerCase()}`)
            : uploadHomepageMedia(supabase, file, `rooms/${roomCode.toLowerCase()}`)
        )
      );
      const room = rooms.find((item) => item.room_code === roomCode)!;
      if (cover) {
        updateRoom(roomCode, {
          cover_image_url: urls[0],
          cover_image_position_x: 50,
          cover_image_position_y: 50,
          cover_image_zoom: 100,
        });
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

  /** Saves the page-level settings (banner, gallery, map, contact). Returns true on success. */
  async function persistSettings() {
    const badUrl = [
      ["ลิงก์ Google Maps", settings.map_url],
      ["Facebook URL", settings.facebook_url],
      ["LINE URL", settings.line_url],
    ].find(([, value]) => safeHttpUrl(value, "") === "");
    if (badUrl) {
      setMessage({ type: "error", text: `${badUrl[0]} ต้องขึ้นต้นด้วย http:// หรือ https://` });
      return false;
    }

    const toSave = { ...settings, gallery_items: normalizeGalleryItems(settings.gallery_items) };
    const { error } = await supabase.from("homepage_settings").upsert({
      ...toSave,
      id: "default",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage({ type: "error", text: `บันทึกไม่สำเร็จ: ${error.message}` });
      return false;
    }
    setSavedSettings(toSave);
    return true;
  }

  /** Saves one room's content. Returns true on success. */
  async function persistRoom(room: HomepageRoom) {
    const monthlyPrice = Number(room.monthly_price);
    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
      setMessage({
        type: "error",
        text: `กรุณากรอกราคาห้อง ${room.room_code} ให้ถูกต้อง`,
      });
      return false;
    }

    const { error } = await supabase.from("homepage_rooms").upsert({
      ...room,
      monthly_price: monthlyPrice,
      cover_image_position_x: clampPercent(room.cover_image_position_x ?? 50),
      cover_image_position_y: clampPercent(room.cover_image_position_y ?? 50),
      cover_image_zoom: clampZoom(room.cover_image_zoom ?? 100),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage({ type: "error", text: `บันทึกห้อง ${room.room_code} ไม่สำเร็จ: ${error.message}` });
      return false;
    }
    setSavedRooms((current) => current.map((item) => (item.room_code === room.room_code ? room : item)));
    return true;
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);
    const ok = await persistSettings();
    setSaving(false);
    if (!ok) return;
    setMessage({ type: "success", text: "บันทึก Banner รูปส่วนกลาง แผนที่ และข้อมูลติดต่อแล้ว" });
    router.refresh();
  }

  async function saveRoom(room: HomepageRoom) {
    setMessage(null);
    setSaving(true);
    const ok = await persistRoom(room);
    setSaving(false);
    if (!ok) return;
    setMessage({ type: "success", text: `บันทึกข้อมูลห้อง ${room.room_code} แล้ว` });
    router.refresh();
  }

  async function saveAll() {
    setMessage(null);
    setSaving(true);
    let saved = 0;
    if (settingsDirty) {
      if (!(await persistSettings())) {
        setSaving(false);
        return;
      }
      saved += 1;
    }
    for (const room of dirtyRooms) {
      if (!(await persistRoom(room))) {
        setSaving(false);
        return;
      }
      saved += 1;
    }
    setSaving(false);
    setMessage({ type: "success", text: `บันทึกครบแล้ว (${saved} ส่วน)` });
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        width="6xl"
        title="จัดการ Homepage"
        subtitle="แก้ไขข้อความ ราคา รูปภาพ แผนที่ และช่องทางติดต่อหน้าแรก"
        actions={
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center rounded-xl border border-brand-200 bg-white px-5 py-2.5 font-semibold text-brand-700 hover:bg-brand-50"
          >
            ดูหน้าเว็บไซต์ <Icon name="external" />
          </a>
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">

        <form onSubmit={saveSettings} className="space-y-8">
          <BannerSection
            settings={settings}
            uploading={uploading}
            updateSetting={updateSetting}
            onUploadBanner={uploadBanner}
          />
          <GalleryEditor
            settings={settings}
            uploading={uploading}
            updateSetting={updateSetting}
            onUploadImages={uploadGalleryImages}
          />
          <LocationSection settings={settings} updateSetting={updateSetting} />
          <ContactSection settings={settings} updateSetting={updateSetting} />
          <div className="flex justify-end">
            <button type="submit" disabled={saving || Boolean(uploading)} className="rounded-xl bg-brand-300 px-7 py-3 font-semibold text-brand-950 shadow-sm hover:bg-brand-400 disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึก Banner รูปส่วนกลาง แผนที่ และข้อมูลติดต่อ"}
            </button>
          </div>
        </form>

        <RoomsSection
          dirtyRoomCodes={dirtyRooms.map((room) => room.room_code)}
          rooms={rooms}
          saving={saving}
          uploading={uploading}
          updateRoom={updateRoom}
          onSaveRoom={saveRoom}
          onUploadImages={uploadRoomImages}
        />
      </div>

      {(dirty || message) && (
        <div className="sticky bottom-0 z-30 mt-8 border-t border-sand-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(60,40,20,0.08)] backdrop-blur sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            {message ? (
              <p
                role="status"
                className={`text-sm font-semibold ${message.type === "success" ? "text-emerald-700" : "text-red-700"}`}
              >
                {message.text}
              </p>
            ) : (
              <p className="text-sm font-semibold text-amber-800">
                มีการแก้ไขที่ยังไม่ได้บันทึก
                {settingsDirty && " · ข้อมูลหน้าแรก"}
                {dirtyRooms.length > 0 && ` · ห้อง ${dirtyRooms.map((room) => room.room_code).join(", ")}`}
              </p>
            )}
            {dirty && (
              <button
                type="button"
                onClick={saveAll}
                disabled={saving || Boolean(uploading)}
                className="rounded-xl bg-brand-300 px-6 py-2.5 font-semibold text-brand-950 shadow-sm hover:bg-brand-400 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกทั้งหมด"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
