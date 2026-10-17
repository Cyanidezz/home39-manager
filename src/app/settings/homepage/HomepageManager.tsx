"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeHttpUrl, type HomepageRoom, type HomepageSettings } from "@/lib/homepage";
import { uploadHomepageImage } from "@/lib/homepageUpload";
import { clampPercent, clampZoom } from "@/lib/bannerCrop";
import BannerSection from "./_components/BannerSection";
import LocationSection from "./_components/LocationSection";
import ContactSection from "./_components/ContactSection";
import RoomsSection from "./_components/RoomsSection";
import Icon from "@/components/Icon";


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

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const badUrl = [
      ["ลิงก์ Google Maps", settings.map_url],
      ["Facebook URL", settings.facebook_url],
      ["LINE URL", settings.line_url],
    ].find(([, value]) => safeHttpUrl(value, "") === "");
    if (badUrl) {
      setMessage({ type: "error", text: `${badUrl[0]} ต้องขึ้นต้นด้วย http:// หรือ https://` });
      return;
    }

    setSaving(true);

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
    const monthlyPrice = Number(room.monthly_price);
    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
      setMessage({
        type: "error",
        text: `กรุณากรอกราคาห้อง ${room.room_code} ให้ถูกต้อง`,
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from("homepage_rooms").upsert({
      ...room,
      monthly_price: monthlyPrice,
      cover_image_position_x: clampPercent(room.cover_image_position_x ?? 50),
      cover_image_position_y: clampPercent(room.cover_image_position_y ?? 50),
      cover_image_zoom: clampZoom(room.cover_image_zoom ?? 100),
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
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-sand-900">จัดการ Homepage</h1>
            <p className="mt-2 text-sand-500">แก้ไขข้อความ ราคา รูปภาพ แผนที่ และช่องทางติดต่อหน้าแรก</p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center rounded-xl border border-brand-200 bg-white px-5 py-3 font-semibold text-brand-700 hover:bg-brand-50"
          >
            ดูหน้าเว็บไซต์ <Icon name="external" />
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
          <BannerSection
            settings={settings}
            uploading={uploading}
            updateSetting={updateSetting}
            onUploadBanner={uploadBanner}
          />
          <LocationSection settings={settings} updateSetting={updateSetting} />
          <ContactSection settings={settings} updateSetting={updateSetting} />
          <div className="flex justify-end">
            <button type="submit" disabled={saving || Boolean(uploading)} className="rounded-xl bg-brand-300 px-7 py-3 font-semibold text-brand-950 shadow-sm hover:bg-brand-400 disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : "บันทึก Banner แผนที่ และข้อมูลติดต่อ"}
            </button>
          </div>
        </form>

        <RoomsSection
          rooms={rooms}
          saving={saving}
          uploading={uploading}
          updateRoom={updateRoom}
          onSaveRoom={saveRoom}
          onUploadImages={uploadRoomImages}
        />
      </div>
    </main>
  );
}
