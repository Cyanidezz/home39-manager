import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  defaultHomepageRooms,
  defaultHomepageSettings,
  type HomepageRoom,
  type HomepageSettings,
} from "@/lib/homepage";

type Client = SupabaseClient<Database>;

export const defaultPaymentSettings = {
  bank_name: "ธนาคารไทยพาณิชย์",
  bank_code: "SCB",
  account_name: "นางสาวพิรญาณ์ จันทร์งาม",
  account_number: "206-269288-7",
};

export async function fetchPaymentSettings(supabase: Client) {
  const { data, error } = await supabase
    .from("payment_settings")
    .select("bank_name, bank_code, account_name, account_number")
    .eq("id", "default")
    .maybeSingle();

  const settings = data
    ? {
        bank_name: data.bank_name,
        bank_code: data.bank_code || "",
        account_name: data.account_name,
        account_number: data.account_number,
      }
    : defaultPaymentSettings;

  return { settings, error };
}

/** Homepage copy and per-room content, falling back to defaults for missing rows. */
export async function fetchHomepageContent(supabase: Client) {
  const [settingsResult, roomsResult] = await Promise.all([
    supabase.from("homepage_settings").select("*").eq("id", "default").maybeSingle(),
    supabase.from("homepage_rooms").select("*").order("room_code"),
  ]);

  const stored = roomsResult.data as HomepageRoom[] | null;

  return {
    settings:
      (settingsResult.data as HomepageSettings | null) || defaultHomepageSettings,
    rooms: defaultHomepageRooms.map(
      (fallback) =>
        stored?.find((room) => room.room_code === fallback.room_code) || fallback
    ),
  };
}
