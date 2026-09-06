"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  roomId: string;
  roomCode: string;
  initialMonthlyRent: number;
};

const WATER_RATE = 150;
const MAX_CONTRACT_SIZE = 10 * 1024 * 1024;

function money(value: string) {
  return (Number(value) || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TenantForm({
  roomId,
  roomCode,
  initialMonthlyRent,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const initialRent = initialMonthlyRent > 0 ? String(initialMonthlyRent) : "";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState(initialRent);
  const [advanceRent, setAdvanceRent] = useState(initialRent);
  const [depositAmount, setDepositAmount] = useState(
    initialMonthlyRent > 0 ? String(initialMonthlyRent * 2) : ""
  );
  const [advanceEdited, setAdvanceEdited] = useState(false);
  const [depositEdited, setDepositEdited] = useState(false);
  const [initialMeter, setInitialMeter] = useState("");
  const [occupantCount, setOccupantCount] = useState(1);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateMonthlyRent(value: string) {
    setMonthlyRent(value);
    const rent = Number(value);
    const calculatedRent = value !== "" && Number.isFinite(rent) ? String(rent) : "";
    if (!advanceEdited) setAdvanceRent(calculatedRent);
    if (!depositEdited) {
      setDepositAmount(calculatedRent ? String(rent * 2) : "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const rent = Number(monthlyRent);
    const advance = Number(advanceRent);
    const deposit = Number(depositAmount);
    const meter = initialMeter === "" ? null : Number(initialMeter);

    if (!fullName.trim()) {
      setError("กรุณากรอกชื่อผู้เช่า");
      return;
    }
    if (!moveInDate) {
      setError("กรุณากรอกวันที่เข้าอยู่");
      return;
    }
    if (!Number.isFinite(rent) || rent <= 0) {
      setError("กรุณากรอกอัตราค่าเช่าต่อเดือนให้ถูกต้อง");
      return;
    }
    if (advanceRent === "" || !Number.isFinite(advance) || advance < 0) {
      setError("กรุณากรอกค่าเช่าล่วงหน้าให้ถูกต้อง");
      return;
    }
    if (depositAmount === "" || !Number.isFinite(deposit) || deposit < 0) {
      setError("กรุณากรอกค่ามัดจำห้องให้ถูกต้อง");
      return;
    }
    if (meter !== null && (!Number.isFinite(meter) || meter < 0)) {
      setError("เลขมิเตอร์ปัจจุบันไม่ถูกต้อง");
      return;
    }
    if (!Number.isInteger(occupantCount) || occupantCount < 1) {
      setError("จำนวนผู้พักต้องไม่น้อยกว่า 1 คน");
      return;
    }
    if (contractFile && contractFile.type !== "application/pdf") {
      setError("สัญญาเช่ารองรับเฉพาะไฟล์ PDF");
      return;
    }
    if (contractFile && contractFile.size > MAX_CONTRACT_SIZE) {
      setError("ไฟล์สัญญาต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    setLoading(true);
    const tenantId = crypto.randomUUID();
    let filePath: string | null = null;

    try {
      if (contractFile) {
        filePath = `${roomCode}/${tenantId}/contract_${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("contracts")
          .upload(filePath, contractFile, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (uploadError) {
          setError(`อัปโหลดสัญญาไม่สำเร็จ: ${uploadError.message}`);
          return;
        }
      }

      const { error: createError } = await supabase.rpc(
        "create_tenant_with_room",
        {
          p_tenant_id: tenantId,
          p_room_id: roomId,
          p_full_name: fullName.trim(),
          p_phone: phone.trim() || null,
          p_move_in_date: moveInDate,
          p_monthly_rent: rent,
          p_advance_rent_amount: advance,
          p_deposit_amount: deposit,
          p_initial_electricity_meter: meter,
          p_occupant_count: occupantCount,
          p_note: note.trim() || null,
          p_contract_file_path: filePath,
          p_contract_original_name: contractFile?.name || null,
        }
      );

      if (createError) {
        if (filePath) {
          await supabase.storage.from("contracts").remove([filePath]);
        }
        setError(
          createError.message.includes("active tenant")
            ? "ห้องนี้มีผู้เช่าปัจจุบันอยู่แล้ว"
            : `บันทึกผู้เช่าไม่สำเร็จ: ${createError.message}`
        );
        return;
      }

      router.push(`/rooms/${roomCode}`);
      router.refresh();
    } catch {
      if (filePath) {
        await supabase.storage.from("contracts").remove([filePath]);
      }
      setError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-7">
      <section className="space-y-5">
        <h2 className="text-lg font-semibold">ข้อมูลผู้เช่า</h2>

        <div>
          <label className="mb-2 block font-medium">ชื่อผู้เช่า *</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
            placeholder="ชื่อ นามสกุล"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-medium">เบอร์โทร</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border px-4 py-3"
              placeholder="08xxxxxxxx"
            />
          </div>
          <div>
            <label className="mb-2 block font-medium">วันที่เข้าอยู่ *</label>
            <input
              required
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block font-medium">
            จำนวนคน *
          </label>
          <input
            required
            type="number"
            min="1"
            step="1"
            value={occupantCount}
            onChange={(e) => setOccupantCount(Number(e.target.value))}
            className="w-full rounded-lg border px-4 py-3"
          />
          <p className="mt-2 text-sm text-gray-500">
            ค่าน้ำ {occupantCount || 0} × {WATER_RATE} ={" "}
            <strong>{((occupantCount || 0) * WATER_RATE).toLocaleString()} บาท/เดือน</strong>
          </p>
        </div>
      </section>

      <section className="space-y-5 border-t pt-7">
        <h2 className="text-lg font-semibold">ค่าเช่าและเงินประกัน</h2>

        <div>
          <label className="mb-2 block font-medium">อัตราค่าเช่าต่อเดือน *</label>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={monthlyRent}
            onChange={(e) => updateMonthlyRent(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
            placeholder="เช่น 5000"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-medium">ค่าเช่าล่วงหน้า *</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={advanceRent}
              onChange={(e) => {
                setAdvanceEdited(true);
                setAdvanceRent(e.target.value);
              }}
              className="w-full rounded-lg border px-4 py-3"
            />
            <p className="mt-2 text-sm text-gray-500">คำนวณเริ่มต้นเท่ากับค่าเช่า 1 เดือน</p>
          </div>

          <div>
            <label className="mb-2 block font-medium">ค่ามัดจำห้อง *</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={(e) => {
                setDepositEdited(true);
                setDepositAmount(e.target.value);
              }}
              className="w-full rounded-lg border px-4 py-3"
            />
            <p className="mt-2 text-sm text-gray-500">คำนวณเริ่มต้นเท่ากับค่าเช่า 2 เดือน</p>
          </div>
        </div>

        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-950">
          <div className="flex justify-between gap-4">
            <span>ค่าเช่าล่วงหน้า</span>
            <strong>{money(advanceRent)} บาท</strong>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <span>ค่ามัดจำห้อง</span>
            <strong>{money(depositAmount)} บาท</strong>
          </div>
          <div className="mt-3 flex justify-between gap-4 border-t border-blue-200 pt-3">
            <span className="font-semibold">รวมรับเมื่อทำสัญญา</span>
            <strong>{money(String((Number(advanceRent) || 0) + (Number(depositAmount) || 0)))} บาท</strong>
          </div>
        </div>
      </section>

      <section className="space-y-5 border-t pt-7">
        <h2 className="text-lg font-semibold">ข้อมูลเพิ่มเติม</h2>

        <div>
          <label className="mb-2 block font-medium">เลขมิเตอร์ปัจจุบัน</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={initialMeter}
            onChange={(e) => setInitialMeter(e.target.value)}
            className="w-full rounded-lg border px-4 py-3"
            placeholder="ใส่ภายหลังได้"
          />
          <p className="mt-2 text-sm text-gray-500">
            หากกรอก ระบบจะใช้เป็นเลขมิเตอร์ครั้งก่อนของบิลแรก
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium">อัปโหลดสัญญาเช่า</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-lg border px-4 py-3"
          />
          <p className="mt-2 text-sm text-gray-500">
            ไม่บังคับ • PDF ขนาดไม่เกิน 10 MB • เพิ่มภายหลังได้
          </p>
          {contractFile && (
            <p className="mt-2 text-sm font-medium text-gray-700">📎 {contractFile.name}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-medium">หมายเหตุ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-28 w-full rounded-lg border px-4 py-3"
            placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับผู้เช่า (ถ้ามี)"
          />
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "บันทึกและสร้างผู้เช่า"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="rounded-lg border px-6 py-3 disabled:opacity-50"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
