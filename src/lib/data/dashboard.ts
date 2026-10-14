import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DashboardBill,
  DashboardExpense,
  DashboardRoom,
} from "@/lib/dashboard";

export async function fetchMonthData(
  supabase: SupabaseClient,
  year: number,
  month: number
) {
  const [roomsResult, billsResult, expensesResult] = await Promise.all([
    supabase
      .from("rooms")
      .select(
        "id, room_code, monthly_rent, occupant_count, status, tenants(full_name, planned_move_out_date, is_active, line_user_id)"
      )
      .order("room_code"),
    supabase
      .from("bills")
      .select(
        "id, room_id, rent_amount, water_amount, electricity_amount, electricity_units, other_amount, total_amount, status"
      )
      .eq("billing_year", year)
      .eq("billing_month", month),
    supabase
      .from("expenses")
      .select("id, category, amount")
      .eq("billing_year", year)
      .eq("billing_month", month),
  ]);

  return {
    rooms: (roomsResult.data || []) as DashboardRoom[],
    bills: (billsResult.data || []) as DashboardBill[],
    expenses: (expensesResult.data || []) as DashboardExpense[],
    error: roomsResult.error || billsResult.error || expensesResult.error,
  };
}
