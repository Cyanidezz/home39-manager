import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export async function fetchRoomList(supabase: Client) {
  return supabase
    .from("rooms")
    .select(
      "id, room_code, monthly_rent, occupant_count, status, tenants(full_name, phone, planned_move_out_date, is_active)"
    )
    .order("room_code");
}

export async function fetchMonthExpenses(
  supabase: Client,
  year: number,
  month: number
) {
  return supabase
    .from("expenses")
    .select("id, expense_date, category, amount, billing_year, billing_month, note, receipt_path")
    .eq("billing_year", year)
    .eq("billing_month", month)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
}
