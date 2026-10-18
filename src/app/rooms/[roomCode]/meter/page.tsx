import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/data/session";
import { bangkokDate, currentPeriod, parsePeriod, thaiMonthNames } from "@/lib/format";
import { METER_START_PERIOD, monthDates, shiftPeriod, type MeterDay } from "@/lib/meter";
import { fetchBillingContext } from "@/lib/data/roomPages";
import { computeMeterBill } from "@/lib/meterBilling";
import MeterBillCard from "./MeterBillCard";
import { MeterDatePicker } from "./MeterDatePicker";
import { tuyaDeviceId } from "@/lib/tuya";
import PageHeader from "@/components/PageHeader";
import { MeterDayRow, type MeterDayView } from "./MeterForm";

type Props = {
  params: Promise<{ roomCode: string }>;
  searchParams: Promise<{ month?: string; date?: string }>;
};

const weekdayFormat = new Intl.DateTimeFormat("th-TH", { weekday: "short", timeZone: "UTC" });
const kwhText = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

export default async function MeterPage({ params, searchParams }: Props) {
  const { roomCode } = await params;
  const { month, date: dateParam } = await searchParams;
  const { supabase } = await requireUser();

  const { data: room } = await supabase.from("rooms").select("id, room_code").eq("room_code", roomCode.toUpperCase()).single();
  if (!room) notFound();

  const thisPeriod = currentPeriod();
  const requested = parsePeriod(month).period;
  // The meter data starts in October 2026; nothing before it and nothing after the current month.
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : null;
  const period = requested < METER_START_PERIOD ? METER_START_PERIOD : requested > thisPeriod ? thisPeriod : requested;
  const [year, monthNumber] = period.split("-").map(Number);
  const prev = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);

  const dates = monthDates(period);
  const { data } = await supabase
    .from("meter_daily_usage")
    .select("usage_date, kwh, source, note")
    .eq("room_id", room.id)
    .gte("usage_date", dates[0])
    .lte("usage_date", dates[dates.length - 1]);
  const byDate = new Map((data ?? ([] as MeterDay[])).map((row) => [row.usage_date, row]));

  const today = bangkokDate();
  const views: MeterDayView[] = dates.map((date) => {
    const row = byDate.get(date);
    return {
      date,
      day: String(Number(date.slice(8))),
      weekday: weekdayFormat.format(new Date(`${date}T00:00:00Z`)),
      future: date > today,
      kwh: row && row.kwh !== null ? Number(row.kwh) : null,
      hasRow: Boolean(row),
      source: row?.source ?? null,
      note: row?.note ?? null,
    };
  });

  const billing = await fetchBillingContext(supabase, room.room_code);
  const billResult = billing
    ? computeMeterBill({
        year,
        month: monthNumber,
        today,
        tenant: billing.tenant
          ? {
              id: billing.tenant.id,
              moveInDate: billing.tenant.move_in_date,
              rentWaivedYear: billing.tenant.rent_waived_year,
              rentWaivedMonth: billing.tenant.rent_waived_month,
            }
          : null,
        room: { monthlyRent: Number(billing.room.monthly_rent), occupantCount: billing.room.occupant_count },
        previousMeter: billing.previousMeter,
        billExists: billing.existingPeriods.includes(period),
        usageByDate: Object.fromEntries(views.map((view) => [view.date, view.kwh])),
      })
    : null;

  const pastDays = views.filter((view) => !view.future);
  const filled = pastDays.filter((view) => view.kwh !== null);
  const total = filled.reduce((sum, view) => sum + view.kwh!, 0);
  const peak = Math.max(...views.map((view) => view.kwh ?? 0), 0);
  const connected = tuyaDeviceId(room.room_code) !== null;

  const navLink = "flex h-10 w-10 items-center justify-center rounded-full border border-sand-300 bg-white text-lg text-brand-800 hover:bg-brand-50";
  const navDisabled = "flex h-10 w-10 items-center justify-center rounded-full border border-sand-200 text-lg text-sand-300";

  return (
    <main className="min-h-screen bg-sand-50 text-sand-900">
      <PageHeader
        width="5xl"
        back={{ href: `/rooms/${room.room_code}`, label: `กลับห้อง ${room.room_code}` }}
        title="มิเตอร์ไฟฟ้า"
        subtitle={`ห้อง ${room.room_code} • ${connected ? "เชื่อมมิเตอร์ Tuya (บันทึกอัตโนมัติทุกเที่ยงคืน)" : "ยังไม่ได้เชื่อมมิเตอร์ Tuya"}`}
      />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          {period > METER_START_PERIOD ? (
            <Link href={`?month=${prev}`} aria-label="เดือนก่อนหน้า" className={navLink}>‹</Link>
          ) : (
            <span aria-hidden className={navDisabled}>‹</span>
          )}
          <h2 className="text-xl font-bold">{thaiMonthNames[monthNumber - 1]} {year + 543}</h2>
          {period < thisPeriod ? (
            <Link href={`?month=${next}`} aria-label="เดือนถัดไป" className={navLink}>›</Link>
          ) : (
            <span aria-hidden className={navDisabled}>›</span>
          )}
        </div>

        <MeterDatePicker min={`${METER_START_PERIOD}-01`} max={today} value={selectedDate ?? ""} />

        <dl className="grid grid-cols-2 gap-3">
          {[
            { label: "รวมเดือนนี้", value: `${kwhText(total)} kWh` },
            { label: "เฉลี่ยต่อวัน", value: filled.length ? `${kwhText(total / filled.length)} kWh` : "-" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-sand-200 bg-white p-4 shadow-sm">
              <dt className="text-sm text-sand-500">{item.label}</dt>
              <dd className="mt-1 text-xl font-bold">{item.value}</dd>
            </div>
          ))}
        </dl>

        {billResult && (
          <MeterBillCard
            roomId={room.id}
            roomCode={room.room_code}
            year={year}
            month={monthNumber}
            monthLabel={`${thaiMonthNames[monthNumber - 1]} ${year + 543}`}
            result={billResult}
          />
        )}

        <div className="rounded-2xl border border-sand-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex h-24 items-end gap-0.5 sm:gap-1" role="img" aria-label={`กราฟหน่วยไฟต่อวัน ${thaiMonthNames[monthNumber - 1]}`}>
            {views.map((view) => (
              <span
                key={view.date}
                title={`${view.day} ${thaiMonthNames[monthNumber - 1]}: ${view.kwh === null ? "ไม่มีข้อมูล" : `${kwhText(view.kwh)} kWh`}`}
                className={`flex-1 rounded-t ${view.kwh === null ? "bg-sand-100" : "bg-brand-300"}`}
                style={{ height: view.kwh === null || peak === 0 ? "4px" : `${Math.max(8, (view.kwh / peak) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-sand-400"><span>1</span><span>{views.length}</span></div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm">
          <div className="border-b border-sand-100 px-4 py-3">
            <h2 className="font-semibold">หน่วยไฟรายวัน</h2>
            <p className="text-sm text-sand-500">
              วันไหนยังไม่มีข้อมูล พิมพ์จำนวนหน่วย (kWh) แล้วกดบันทึกได้เลย ค่าที่กรอกเองจะไม่ถูกระบบอัตโนมัติเขียนทับ
            </p>
          </div>
          <ul className="divide-y divide-sand-100">
            {views.map((view) => (
              <MeterDayRow key={view.date} roomId={room.id} view={view} selected={view.date === selectedDate} />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
