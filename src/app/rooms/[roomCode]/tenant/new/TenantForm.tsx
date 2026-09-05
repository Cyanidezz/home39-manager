"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  roomId: string;
  roomCode: string;
};

export default function TenantForm({ roomId, roomCode }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [occupantCount, setOccupantCount] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error: tenantError } = await supabase
      .from("tenants")
      .insert({
        room_id: roomId,
        full_name: fullName,
        phone: phone || null,
        move_in_date: moveInDate || null,
        is_active: true,
      });

    if (tenantError) {
      setError(tenantError.message);
      setLoading(false);
      return;
    }

    const { error: roomError } = await supabase
      .from("rooms")
      .update({
        occupant_count: occupantCount,
        status: "occupied",
      })
      .eq("id", roomId);

    if (roomError) {
      setError(roomError.message);
      setLoading(false);
      return;
    }

    router.push(`/rooms/${roomCode}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label className="mb-2 block font-medium">
          ชื่อ-นามสกุลผู้เช่า *
        </label>

        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
          placeholder="ชื่อ นามสกุล"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          เบอร์โทรศัพท์
        </label>

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
          placeholder="08xxxxxxxx"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">
          จำนวนผู้พัก
        </label>

        <select
          value={occupantCount}
          onChange={(e) => setOccupantCount(Number(e.target.value))}
          className="w-full rounded-lg border px-4 py-3"
        >
          <option value={1}>1 คน — ค่าน้ำ 150 บาท</option>
          <option value={2}>2 คน — ค่าน้ำ 300 บาท</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block font-medium">
          วันที่เริ่มเช่า
        </label>

        <input
          type="date"
          value={moveInDate}
          onChange={(e) => setMoveInDate(e.target.value)}
          className="w-full rounded-lg border px-4 py-3"
        />
      </div>

      <div className="rounded-lg bg-blue-50 p-4">
        <p className="font-medium">สรุปค่าใช้จ่ายพื้นฐาน</p>

        <p className="mt-2 text-sm">
          ค่าน้ำ {occupantCount} × 150 ={" "}
          <strong>{occupantCount * 150} บาท/เดือน</strong>
        </p>

        <p className="text-sm">
          ค่าไฟ <strong>7 บาท/หน่วย</strong>
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-6 py-3 text-white disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "บันทึกผู้เช่า"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border px-6 py-3"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}