import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bangkokDate } from "@/lib/format";
import { monthDates } from "@/lib/meter";
import { computeMeterBill, meterBillBlockText } from "@/lib/meterBilling";
import { billCreationError, pickPreviousMeter } from "@/lib/billing";
import { fetchBillingRates } from "@/lib/data/settings";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ roomId: string }> };

/** Issue the bill of a finished month from the meter's daily usage. The numbers are worked out here, never taken from the browser. */
export async function POST(request: Request, { params }: Params) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }
  const { roomId } = await params;
  if (!uuidPattern.test(roomId)) return NextResponse.json({ error: "รหัสห้องไม่ถูกต้อง" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { year?: unknown; month?: unknown } | null;
  const year = Number(body?.year);
  const month = Number(body?.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "เดือนไม่ถูกต้อง" }, { status: 400 });
  }
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const dates = monthDates(period);

  const { data: room } = await supabase.from("rooms").select("id, room_code, monthly_rent, occupant_count").eq("id", roomId).single();
  if (!room) return NextResponse.json({ error: "ไม่พบห้อง" }, { status: 404 });

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, move_in_date, rent_waived_year, rent_waived_month, initial_electricity_meter")
    .eq("room_id", roomId)
    .eq("is_active", true)
    .maybeSingle();

  const latest = (tenantId?: string) => {
    let query = supabase.from("bills").select("current_meter").eq("room_id", roomId).not("current_meter", "is", null);
    if (tenantId) query = query.eq("tenant_id", tenantId);
    return query.order("billing_year", { ascending: false }).order("billing_month", { ascending: false }).limit(1).maybeSingle();
  };
  const [rates, tenantLatest, roomLatest, existing, usage] = await Promise.all([
    fetchBillingRates(supabase),
    tenant ? latest(tenant.id) : Promise.resolve({ data: null }),
    latest(),
    supabase.from("bills").select("id").eq("room_id", roomId).eq("billing_year", year).eq("billing_month", month).limit(1),
    supabase.from("meter_daily_usage").select("usage_date, kwh").eq("room_id", roomId).gte("usage_date", dates[0]).lte("usage_date", dates[dates.length - 1]),
  ]);

  const result = computeMeterBill({
    year,
    month,
    today: bangkokDate(),
    tenant: tenant
      ? { id: tenant.id, moveInDate: tenant.move_in_date, rentWaivedYear: tenant.rent_waived_year, rentWaivedMonth: tenant.rent_waived_month }
      : null,
    room: { monthlyRent: Number(room.monthly_rent), occupantCount: room.occupant_count },
    rates,
    previousMeter: pickPreviousMeter({
      tenantLatest: tenantLatest.data?.current_meter,
      tenantInitial: tenant?.initial_electricity_meter,
      roomLatest: roomLatest.data?.current_meter,
    }),
    billExists: (existing.data?.length ?? 0) > 0,
    usageByDate: Object.fromEntries((usage.data ?? []).map((row) => [row.usage_date, row.kwh === null ? null : Number(row.kwh)])),
  });
  if (!result.ok) return NextResponse.json({ error: meterBillBlockText(result.block) }, { status: 409 });
  if (!tenant) return NextResponse.json({ error: "ห้องนี้ไม่มีผู้เช่าปัจจุบัน" }, { status: 409 });

  const { bill } = result;
  const { data: billId, error } = await supabase.rpc("create_bill_with_items", {
    p_room_id: roomId,
    p_tenant_id: tenant.id,
    p_billing_year: year,
    p_billing_month: month,
    p_rent_amount: bill.rent,
    p_occupant_count: room.occupant_count,
    p_water_rate_per_person: bill.waterRate,
    p_water_amount: bill.water,
    p_previous_meter: bill.previousMeter,
    p_current_meter: bill.currentMeter,
    p_electricity_units: bill.units,
    p_electricity_rate: bill.electricityRate,
    p_electricity_amount: bill.electricity,
    p_other_amount: 0,
    p_total_amount: bill.total,
    p_due_date: bill.dueDate,
    p_items: [],
  });
  if (error || !billId) {
    const message = billCreationError(error?.message ?? "", { roomCode: room.room_code, month, year });
    console.error("Issue bill from meter failed:", error);
    return NextResponse.json({ error: message || "ออกบิลไม่สำเร็จ" }, { status: 409 });
  }
  return NextResponse.json({ billId, roomCode: room.room_code });
}
