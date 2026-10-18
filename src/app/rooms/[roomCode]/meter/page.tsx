import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import { bangkokDate, formatThaiDate } from "@/lib/format";
import { dailySeries, METER_HISTORY_DAYS, addDays, type MeterDay } from "@/lib/meter";
import { tuyaDeviceId } from "@/lib/tuya";
import PageHeader from "@/components/PageHeader";
import { DeleteDayButton, MeterForm } from "./MeterForm";

type Props = { params: Promise<{ roomCode: string }> };

export default async function MeterPage({ params }: Props) {
  const { roomCode } = await params;
  const { supabase } = await requireUser();

  const { data: room } = await supabase.from("rooms").select("id, room_code").eq("room_code", roomCode.toUpperCase()).single();
  if (!room) notFound();

  const today = bangkokDate();
  const from = addDays(today, -(METER_HISTORY_DAYS - 1));
  const { data } = await supabase
    .from("meter_daily_usage")
    .select("usage_date, kwh, source, note")
    .eq("room_id", room.id)
    .gte("usage_date", from)
    .order("usage_date", { ascending: false });
  const rows: MeterDay[] = data ?? [];
  const series = dailySeries(rows, today, METER_HISTORY_DAYS);
  const connected = tuyaDeviceId(room.room_code) !== null;

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        width="5xl"
        back={{ href: `/rooms/${room.room_code}`, label: `กลับห้อง ${room.room_code}` }}
        title="มิเตอร์ไฟฟ้า"
        subtitle={`ห้อง ${room.room_code} • ${connected ? "เชื่อมมิเตอร์ Tuya (บันทึกอัตโนมัติทุกเที่ยงคืน)" : "ยังไม่ได้เชื่อมมิเตอร์ Tuya"}`}
      />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
        <section className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">กรอกหน่วยไฟเอง</h2>
          <p className="mb-4 mt-1 text-sm text-sand-500">
            ใช้กับวันที่มิเตอร์ดึงย้อนหลังไม่ได้ ค่าที่กรอกเองจะไม่ถูกระบบอัตโนมัติเขียนทับ
          </p>
          <MeterForm roomId={room.id} />
        </section>

        <section className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">หน่วยไฟต่อวัน ({METER_HISTORY_DAYS} วันล่าสุด)</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200 text-left text-sand-500">
                  <th className="py-2 pr-4 font-medium">วันที่</th>
                  <th className="py-2 pr-4 text-right font-medium">หน่วย (kWh)</th>
                  <th className="py-2 pr-4 font-medium">ที่มา</th>
                  <th className="py-2 pr-4 font-medium">หมายเหตุ</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {series.map(({ date, row, kwh }) => (
                  <tr key={date}>
                    <td className="py-2 pr-4">{formatThaiDate(date)}</td>
                    <td className="py-2 pr-4 text-right font-semibold">
                      {kwh === null ? <span className="font-normal text-sand-400">{row ? "ไม่มีผลต่าง" : "-"}</span> : kwh.toLocaleString("th-TH", { maximumFractionDigits: 3 })}
                    </td>
                    <td className="py-2 pr-4 text-sand-600">{row ? (row.source === "manual" ? "กรอกเอง" : "มิเตอร์ Tuya") : ""}</td>
                    <td className="py-2 pr-4 text-sand-600">{row?.note}</td>
                    <td className="py-2 text-right">{row && <DeleteDayButton roomId={room.id} date={date} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
