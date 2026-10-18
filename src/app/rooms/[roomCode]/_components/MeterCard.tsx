import Link from "next/link";
import Icon from "@/components/Icon";
import { bangkokDate, formatThaiDate } from "@/lib/format";
import { dailySeries, usageSummary, type MeterDay } from "@/lib/meter";
import { EmptyNote, InfoCard, InfoRows, secondaryButton } from "./InfoCard";

type Props = {
  roomCode: string;
  days: MeterDay[];
  /** Whether a Tuya meter is configured for this room (otherwise only hand-entered days show up). */
  connected: boolean;
};

const kwhText = (value: number) => `${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })} kWh`;

/** Electricity usage of the last days, from the smart meter or typed in by hand. */
export default function MeterCard({ roomCode, days, connected }: Props) {
  const series = dailySeries(days, bangkokDate(), 14);
  const latest = series.find((day) => day.kwh !== null);
  const week = usageSummary(series, 7);
  const peak = Math.max(...series.map((day) => day.kwh ?? 0), 0);

  return (
    <InfoCard
      icon={<Icon name="bolt" className="h-5 w-5" />}
      title="มิเตอร์ไฟฟ้า"
      footer={
        <Link href={`/rooms/${roomCode}/meter`} className={secondaryButton}>
          ดูข้อมูลทั้งหมด
        </Link>
      }
    >
      {!connected && (
        <p className="mb-3 text-sm text-sand-500">ห้องนี้ยังไม่ได้เชื่อมมิเตอร์ Tuya (กรอกหน่วยไฟเองได้)</p>
      )}
      {latest ? (
        <>
          <InfoRows
            rows={[
              { label: `ล่าสุด (${formatThaiDate(latest.date)})`, value: kwhText(latest.kwh!) },
              { label: "7 วันล่าสุดรวม", value: `${kwhText(week.total)} (${week.daysWithData}/7 วัน)` },
              { label: "เฉลี่ยต่อวัน", value: week.average === null ? "-" : kwhText(week.average) },
            ]}
          />
          <div
            className="mt-4 flex h-14 items-end gap-1"
            role="img"
            aria-label="หน่วยไฟต่อวัน 14 วันล่าสุด"
          >
            {[...series].reverse().map((day) => (
              <span
                key={day.date}
                title={`${formatThaiDate(day.date)}: ${day.kwh === null ? "ไม่มีข้อมูล" : kwhText(day.kwh)}`}
                className={`flex-1 rounded-t ${day.kwh === null ? "bg-sand-100" : "bg-brand-300"}`}
                style={{ height: day.kwh === null || peak === 0 ? "4px" : `${Math.max(8, (day.kwh / peak) * 100)}%` }}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyNote>ยังไม่มีข้อมูลหน่วยไฟ ระบบจะบันทึกให้ทุกเที่ยงคืน</EmptyNote>
      )}
    </InfoCard>
  );
}
