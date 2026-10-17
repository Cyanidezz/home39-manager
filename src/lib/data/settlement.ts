import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { pickPreviousMeter } from "@/lib/billing";

type Client = SupabaseClient<Database>;

const SLIP_URL_TTL_SECONDS = 60 * 10;
/** Issued bills still owed when the room is handed back; they are paid out of the deposit. */
export const OUTSTANDING_STATUSES = ["unpaid", "overdue", "rejected"];
/** Bills whose payment slip has been sent but not checked yet; they must be settled before closing. */
export const PENDING_CHECK_STATUSES = ["slip_submitted", "verifying"];

/** The last tenant of a room who has moved out and whose deposit settlement is still to be done or just done. */
export async function fetchLastMovedOutTenant(supabase: Client, roomId: string) {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name, move_out_date, deposit_amount")
    .eq("room_id", roomId)
    .eq("is_active", false)
    .not("move_out_date", "is", null)
    .order("move_out_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!tenant) return null;

  const { data: settlement } = await supabase
    .from("move_out_settlements")
    .select("status, refund_amount, refunded_on")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  return { tenant, settlement };
}

/** Everything the settlement page needs, or null when the room or tenant is unknown / has not moved out. */
export async function fetchSettlementContext(supabase: Client, roomCode: string, tenantId: string) {
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code")
    .eq("room_code", roomCode.toUpperCase())
    .single();
  if (!room) return null;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name, phone, move_in_date, move_out_date, is_active, deposit_amount, advance_rent_amount, initial_electricity_meter, room_id")
    .eq("id", tenantId)
    .single();
  if (!tenant || tenant.room_id !== room.id || tenant.is_active || !tenant.move_out_date) return null;

  const [settlementResult, billsResult] = await Promise.all([
    supabase.from("move_out_settlements").select("*").eq("tenant_id", tenantId).maybeSingle(),
    supabase
      .from("bills")
      .select("id, billing_year, billing_month, total_amount, status, current_meter, occupant_count")
      .eq("tenant_id", tenantId)
      .order("billing_year", { ascending: false })
      .order("billing_month", { ascending: false }),
  ]);

  const bills = billsResult.data ?? [];
  const lastMetered = bills.find((bill) => bill.current_meter !== null);
  const settlement = settlementResult.data;

  let slipUrl: string | null = null;
  if (settlement?.refund_slip_path) {
    const { data } = await supabase.storage
      .from("refund-slips")
      .createSignedUrl(settlement.refund_slip_path, SLIP_URL_TTL_SECONDS);
    slipUrl = data?.signedUrl ?? null;
  }

  return {
    room,
    tenant,
    settlement,
    slipUrl,
    outstandingBills: bills.filter((bill) => OUTSTANDING_STATUSES.includes(bill.status)),
    pendingCheckBills: bills.filter((bill) => PENDING_CHECK_STATUSES.includes(bill.status)),
    previousMeter: pickPreviousMeter({
      tenantLatest: lastMetered?.current_meter,
      tenantInitial: tenant.initial_electricity_meter,
      roomLatest: null,
    }),
    lastOccupants: bills[0]?.occupant_count ?? null,
  };
}
