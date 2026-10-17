import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchLastMovedOutTenant } from "@/lib/data/settlement";

type Client = SupabaseClient<Database>;

const CONTRACT_URL_TTL_SECONDS = 60 * 10;

/** Everything the room page shows, or null when the room code is unknown. */
export async function fetchRoomOverview(supabase: Client, roomCode: string) {
  const { data: room, error } = await supabase
    .from("rooms")
    .select("id, room_code, monthly_rent, occupant_count, status, note")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (error || !room) return null;

  const [tenantsResult, billsResult, contractsResult] = await Promise.all([
    supabase
      .from("tenants")
      .select(
        "id, full_name, phone, move_in_date, move_out_date, is_active, note, termination_notice_date, planned_move_out_date, advance_rent_amount, deposit_amount, initial_electricity_meter"
      )
      .eq("room_id", room.id)
      .eq("is_active", true),
    supabase
      .from("bills")
      .select("id, billing_year, billing_month, total_amount, status, current_meter")
      .eq("room_id", room.id)
      .order("billing_year", { ascending: false })
      .order("billing_month", { ascending: false })
      .limit(5),
    supabase
      .from("contracts")
      .select(
        "id, contract_start, contract_end, deposit_amount, file_path, original_file_name, note, created_at"
      )
      .eq("room_id", room.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const latestContract = contractsResult.data?.[0];
  let contractUrl: string | null = null;

  if (latestContract?.file_path) {
    const { data } = await supabase.storage
      .from("contracts")
      .createSignedUrl(latestContract.file_path, CONTRACT_URL_TTL_SECONDS);
    contractUrl = data?.signedUrl ?? null;
  }

  const tenants = tenantsResult.data ?? [];
  // A room with nobody in it: the tenant who just left may still have a deposit to settle.
  const lastMovedOut = tenants.length === 0 ? await fetchLastMovedOutTenant(supabase, room.id) : null;

  return {
    room,
    lastMovedOut,
    tenants,
    bills: billsResult.data ?? [],
    latestContract,
    contractUrl,
  };
}
