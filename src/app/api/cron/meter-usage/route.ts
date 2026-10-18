import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { previousBangkokDate } from "@/lib/meter";
import { readMeter, tuyaConfig, tuyaDeviceId } from "@/lib/tuya";

export const runtime = "nodejs";
export const maxDuration = 60;

function bearerMatches(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Runs at Bangkok midnight: stores each connected meter's running total as the end of the previous day. */
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

  const usageDate = previousBangkokDate();
  const results: Record<string, string> = {};
  for (const room of rooms ?? []) {
    const deviceId = tuyaDeviceId(room.room_code);
    if (!deviceId) continue;
    try {
      const meter = await readMeter(config, deviceId);
      if (!meter.online || meter.totalKwh === null) {
        results[room.room_code] = "offline";
        continue;
      }
      const { data, error: saveError } = await supabase.rpc("record_meter_total", {
        p_room_id: room.id,
        p_usage_date: usageDate,
        p_total_kwh: meter.totalKwh,
      });
      if (saveError) throw saveError;
      const outcome = data as { skipped?: string; kwh?: number | null };
      results[room.room_code] = outcome.skipped ? `skipped (${outcome.skipped})` : `ok ${outcome.kwh ?? "no previous total"}`;
    } catch (failure) {
      console.error(`Meter job failed for room ${room.room_code}:`, failure);
      results[room.room_code] = "error";
    }
  }

  return NextResponse.json({ usageDate, results });
}
