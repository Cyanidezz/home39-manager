import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { pickPreviousMeter } from "@/lib/billing";

type Client = SupabaseClient<Database>;

/** Context for the "new bill" page, or null when the room code is unknown. */
export async function fetchBillingContext(supabase: Client, roomCode: string) {
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code, monthly_rent, occupant_count")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (!room) return null;

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, full_name, rent_waived_year, rent_waived_month, initial_electricity_meter, line_user_id"
    )
    .eq("room_id", room.id)
    .eq("is_active", true)
    .maybeSingle();

  // Latest metered bill, newest first. Scoped to the current tenant first: a new tenant's
  // starting reading is their own move-in reading, not the previous tenant's last bill.
  const latestMeteredBill = (tenantId?: string) => {
    let query = supabase
      .from("bills")
      .select("billing_year, billing_month, current_meter")
      .eq("room_id", room.id)
      .not("current_meter", "is", null);
    if (tenantId) query = query.eq("tenant_id", tenantId);
    return query
      .order("billing_year", { ascending: false })
      .order("billing_month", { ascending: false })
      .limit(1)
      .maybeSingle();
  };

  const [tenantLatestResult, roomLatestResult, periodsResult] = await Promise.all([
    tenant ? latestMeteredBill(tenant.id) : Promise.resolve({ data: null }),
    latestMeteredBill(),
    // Periods that already have a bill ("YYYY-MM"), so the form can warn before submitting.
    supabase.from("bills").select("billing_year, billing_month").eq("room_id", room.id),
  ]);

  const existingPeriods = (periodsResult.data ?? []).map(
    (bill) => `${bill.billing_year}-${String(bill.billing_month).padStart(2, "0")}`
  );
  const previousMeter = pickPreviousMeter({
    tenantLatest: tenantLatestResult.data?.current_meter,
    tenantInitial: tenant?.initial_electricity_meter,
    roomLatest: roomLatestResult.data?.current_meter,
  });

  return { room, tenant, previousMeter, existingPeriods };
}

/** All bills for a room (newest first), or null when the room code is unknown. */
export async function fetchBillHistory(supabase: Client, roomCode: string) {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, room_code")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (roomError) console.error("Bills history - room query error:", roomError);
  if (!room) return null;

  const { data: bills, error: billsError } = await supabase
    .from("bills")
    .select("id, billing_year, billing_month, total_amount, due_date, status, created_at")
    .eq("room_id", room.id)
    .order("billing_year", { ascending: false })
    .order("billing_month", { ascending: false })
    .order("created_at", { ascending: false });

  if (billsError) {
    console.error("Bills history - bills query error:", billsError);
    throw new Error(`โหลดประวัติบิลไม่สำเร็จ: ${billsError.message}`);
  }

  return { room, bills: bills ?? [] };
}

/** Room plus its current tenant (if any) for the contract upload page. */
export async function fetchContractContext(supabase: Client, roomCode: string) {
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (!room) return null;

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, full_name")
    .eq("room_id", room.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  return { room, tenant };
}

/** Room and tenant for the tenant edit page; null if either does not match. */
export async function fetchTenantEditContext(
  supabase: Client,
  roomCode: string,
  tenantId: string
) {
  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code, occupant_count")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (!room) return null;

  const { data: tenant } = await supabase
    .from("tenants")
    .select(
      "id, full_name, phone, move_in_date, note, room_id, line_user_id, termination_notice_date, planned_move_out_date"
    )
    .eq("id", tenantId)
    .eq("room_id", room.id)
    .single();

  if (!tenant) return null;

  return { room, tenant };
}
