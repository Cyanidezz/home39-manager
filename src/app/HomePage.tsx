"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { HomepageRoom, HomepageSettings } from "@/lib/homepage";
import type { MapDestination } from "@/lib/mapLinks";
import Hero from "./_components/home/Hero";
import RoomCards from "./_components/home/RoomCards";
import GallerySection from "./_components/home/GallerySection";
import LocationSection from "./_components/home/LocationSection";
import ContactSection from "./_components/home/ContactSection";
import LoginDialog from "./_components/home/LoginDialog";
import RoomDialog from "./_components/home/RoomDialog";
import type { DisplayRoom, Room } from "./_components/home/types";
import Icon from "@/components/Icon";

type Props = {
  rooms: Room[];
  isLoggedIn: boolean;
  settings: HomepageSettings;
  homepageRooms: HomepageRoom[];
  nearbyDestinations: Record<string, MapDestination>;
};

export default function HomePage({ rooms, isLoggedIn, settings, homepageRooms, nearbyDestinations }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<DisplayRoom | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayRooms: DisplayRoom[] = ["A", "B", "C"].map((code) => {
    const room = rooms.find((item) => item.room_code === code) || {
        room_code: code,
        monthly_rent: 0,
        occupant_count: 0,
        status: "vacant",
      };
    const content = homepageRooms.find((item) => item.room_code === code) || {
      room_code: code,
      title: `ห้อง ${code}`,
      description: "สอบถามรายละเอียดเพิ่มเติม",
      monthly_price: room.monthly_rent,
      cover_image_url: null,
      cover_image_position_x: 50,
      cover_image_position_y: 50,
      cover_image_zoom: 100,
      image_urls: [],
    };
    return { ...room, ...content };
  });

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-sand-50">
      <header className="sticky top-0 z-40 border-b border-sand-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <a href="#" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-300 text-xl text-brand-950 shadow-md shadow-brand-200">
              <Icon name="building" className="h-6 w-6" />
            </span>
            <div>
              <p className="text-lg font-bold leading-tight">Home 39</p>
              <p className="text-xs text-sand-500">Hatyai</p>
            </div>
          </a>

          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg bg-brand-300 px-5 py-2.5 text-sm font-semibold text-brand-950 shadow-sm hover:bg-brand-400"
            >
              กลับหน้าจัดการ
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError("");
                setLoginOpen(true);
              }}
              className="rounded-lg bg-brand-300 px-5 py-2.5 text-sm font-semibold text-brand-950 shadow-sm hover:bg-brand-400"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </header>

      <Hero settings={settings} />
      <RoomCards rooms={displayRooms} onSelect={setSelectedRoom} />
      <GallerySection settings={settings} />
      <LocationSection settings={settings} destinations={nearbyDestinations} />
      <ContactSection settings={settings} />

      <footer className="border-t border-sand-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-sand-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© Home 39 - Hatyai</p>
          <p>ห้องพักสะดวกสบายในเมืองหาดใหญ่</p>
        </div>
      </footer>

      {loginOpen && (
        <LoginDialog
          email={email}
          password={password}
          loading={loading}
          error={error}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={login}
          onClose={() => setLoginOpen(false)}
        />
      )}

      {selectedRoom && (
        <RoomDialog
          room={selectedRoom}
          settings={settings}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </main>
  );
}
