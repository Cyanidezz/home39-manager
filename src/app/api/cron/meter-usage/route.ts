import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bangkokDate } from "@/lib/format";
import { readDailyEndTotals, tuyaConfig, tuyaDeviceId } from "@/lib/tuya";

export const runtime = "nodejs";
export const maxDuration = 60;

function bearerMatches(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Runs at Bangkok midnight: stores each connected meter's end-of-day totals for the days Tuya still has. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = tuyaConfig();
  if (!config) return NextResponse.json({ error: "Tuya is not configured" }, { status: 503 });

  const supabase = createAdminClient();
  const { data: rooms, error } = await supabase.from("rooms").select("id, room_code");
  if (error) {
    console.error("Meter job: room query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // The last 7 days of the report log, every night: a missed run or a late start is filled in by the next one.
  const today = bangkokDate();
  const since = new Date(Date.now() - 8 * 86_400_000);
  const results: Record<string, string> = {};
  for (const room of rooms ?? []) {
    const deviceId = tuyaDeviceId(room.room_code);
    if (!deviceId) continue;
    try {
      const totals = await readDailyEndTotals(config, deviceId, since);
      const days = Object.keys(totals).filter((day) => day < today).sort();
      let saved = 0;
      for (const day of days) {
        const { error: saveError } = await supabase.rpc("record_meter_total", {
          p_room_id: room.id,
          p_usage_date: day,
          p_total_kwh: totals[day],
        });
        if (saveError) throw saveError;
        saved += 1;
      }
      results[room.room_code] = days.length ? `ok ${saved} days (${days[0]}..${days[days.length - 1]})` : "no data";
    } catch (failure) {
      console.error(`Meter job failed for room ${room.room_code}:`, failure);
      results[room.room_code] = "error";
    }
  }

  return NextResponse.json({ today, results });
}
