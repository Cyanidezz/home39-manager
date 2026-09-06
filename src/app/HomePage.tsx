"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Room = {
  room_code: string;
  monthly_rent: number | string;
  occupant_count: number;
  status: string;
};

type Props = {
  rooms: Room[];
};

const roomDescriptions: Record<string, string> = {
  A: "ห้องพักส่วนตัว บรรยากาศสงบ เหมาะสำหรับพักอาศัยระยะยาว",
  B: "ห้องพักสะดวกสบาย ในทำเลเดินทางง่ายใจกลางหาดใหญ่",
  C: "พื้นที่พักอาศัยเป็นสัดส่วน พร้อมติดต่อสอบถามรายละเอียดเพิ่มเติม",
};

function money(value: number | string) {
  return Number(value || 0).toLocaleString("th-TH");
}

export default function HomePage({ rooms }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayRooms = ["A", "B", "C"].map(
    (code) =>
      rooms.find((room) => room.room_code === code) || {
        room_code: code,
        monthly_rent: 0,
        occupant_count: 0,
        status: "vacant",
      }
  );

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
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <a href="#" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-xl text-white shadow-md shadow-blue-200">
              🏢
            </span>
            <div>
              <p className="text-lg font-bold leading-tight">Home 39</p>
              <p className="text-xs text-slate-500">Hatyai</p>
            </div>
          </a>

          <button
            type="button"
            onClick={() => {
              setError("");
              setLoginOpen(true);
            }}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-300/20" />
        <div className="relative mx-auto grid min-h-[470px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium">
              ห้องพักในเมืองหาดใหญ่
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
              อยู่สบาย เดินทางสะดวก
              <span className="block text-blue-100">ที่ Home 39</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-blue-50">
              ตรวจสอบสถานะห้องพัก ดูรายละเอียด และติดต่อสอบถามห้องว่างได้ในหน้าเดียว
            </p>
            <a
              href="#rooms"
              className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg hover:bg-blue-50"
            >
              ดูห้องพัก ↓
            </a>
          </div>

          <div className="relative mx-auto flex h-72 w-full max-w-md items-end justify-center rounded-[2rem] border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-sm">
            <div className="absolute inset-x-10 bottom-8 top-10 rounded-t-[2rem] border-4 border-white/80 bg-white/10">
              <div className="grid h-full grid-cols-3 gap-4 p-5">
                {Array.from({ length: 9 }).map((_, index) => (
                  <span key={index} className="rounded-md bg-blue-100/90 shadow-inner" />
                ))}
              </div>
            </div>
            <div className="relative h-16 w-20 rounded-t-xl bg-white/90" />
          </div>
        </div>
      </section>

      <section id="rooms" className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Our rooms
          </p>
          <h2 className="mt-2 text-3xl font-bold">ห้องพัก Home 39</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            เลือกห้องเพื่อดูรายละเอียด สถานะ และรูปภาพเพิ่มเติม
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {displayRooms.map((room) => {
            const vacant = room.status !== "occupied";
            return (
              <button
                key={room.room_code}
                type="button"
                onClick={() => setSelectedRoom(room)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
              >
                <div className="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-slate-100 to-blue-50">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-200/60" />
                  <div className="absolute bottom-5 left-6 h-24 w-36 rounded-xl border-4 border-white bg-blue-200 shadow-lg">
                    <div className="absolute bottom-0 left-0 h-12 w-full bg-white/80" />
                  </div>
                  <span className="relative rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow">
                    รูปห้อง {room.room_code}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold">ห้อง {room.room_code}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        vacant
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {vacant ? "ห้องว่าง" : "มีผู้เช่า"}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                    {roomDescriptions[room.room_code]}
                  </p>
                  {Number(room.monthly_rent) > 0 && (
                    <p className="mt-4 font-semibold text-blue-700">
                      {money(room.monthly_rent)} บาท/เดือน
                    </p>
                  )}
                  <p className="mt-4 border-t border-slate-100 pt-4 text-sm font-semibold text-blue-600">
                    ดูรายละเอียดและรูปภาพ →
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-blue-50">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#93c5fd_1px,transparent_1px),linear-gradient(90deg,#93c5fd_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="relative text-center">
              <span className="text-6xl">📍</span>
              <p className="mt-3 font-bold text-blue-800">Home 39 Hatyai</p>
              <a
                href="https://share.google/9SpwEy5eYMnBt4cnd"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                เปิดเส้นทางใน Google Maps
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Location
            </p>
            <h2 className="mt-2 text-3xl font-bold">เดินทางสะดวกในหาดใหญ่</h2>
            <p className="mt-4 leading-7 text-slate-500">
              เปิดแผนที่เพื่อดูเส้นทางมายัง Home 39 และตรวจสอบระยะทางจากตำแหน่งของคุณ
            </p>
            <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="font-semibold">สถานที่ใกล้เคียง</p>
              <div className="mt-4 flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">🎓</span>
                <div>
                  <p className="font-medium">โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.)</p>
                  <p className="mt-1 text-sm text-slate-500">
                    สถานศึกษาสำคัญในพื้นที่หาดใหญ่
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 to-blue-600 p-8 text-white shadow-xl sm:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-bold">สนใจจองห้องพัก?</h2>
              <p className="mt-3 text-blue-100">
                ติดต่อสอบถามสถานะห้อง ราคา และรายละเอียดเพิ่มเติมได้ทุกช่องทาง
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.facebook.com/home39hdy"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
              >
                Facebook
              </a>
              <a
                href="https://line.me/R/ti/p/%40069jzotj"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
              >
                LINE @069jzotj
              </a>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-6 text-blue-50">
            <a href="tel:0870954441">โทร 087-0954441</a>
            <a href="tel:0894644898">โทร 089-4644898</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© Home 39 - Hatyai</p>
          <p>ห้องพักสะดวกสบายในเมืองหาดใหญ่</p>
        </div>
      </footer>

      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">เข้าสู่ระบบ</h2>
                <p className="mt-1 text-sm text-slate-500">สำหรับผู้ดูแล Home 39</p>
              </div>
              <button
                type="button"
                onClick={() => setLoginOpen(false)}
                className="text-2xl text-slate-400 hover:text-slate-700"
                aria-label="ปิด"
              >
                ×
              </button>
            </div>

            <form onSubmit={login} className="mt-7 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">อีเมล</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold">ห้อง {selectedRoom.room_code}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {roomDescriptions[selectedRoom.room_code]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="text-2xl text-slate-400 hover:text-slate-700"
                aria-label="ปิด"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {["มุมห้อง", "พื้นที่พักผ่อน", "บริเวณภายใน", "รายละเอียดห้อง"].map(
                  (label, index) => (
                    <div
                      key={label}
                      className="flex aspect-[4/3] items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-100"
                    >
                      <div className="text-center">
                        <span className="text-4xl">🛏️</span>
                        <p className="mt-3 text-sm font-semibold text-blue-700">
                          รูปห้อง {selectedRoom.room_code} · {label}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          ภาพที่ {index + 1}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">สถานะ</p>
                  <p className="mt-1 font-semibold text-blue-700">
                    {selectedRoom.status === "occupied" ? "มีผู้เช่า" : "ห้องว่าง"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">ค่าเช่ารายเดือน</p>
                  <p className="mt-1 font-semibold">
                    {Number(selectedRoom.monthly_rent) > 0
                      ? `${money(selectedRoom.monthly_rent)} บาท`
                      : "กรุณาสอบถาม"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">สอบถามเพิ่มเติม</p>
                  <a href="tel:0870954441" className="mt-1 block font-semibold text-blue-700">
                    087-0954441
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
