import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  defaultHomepageRooms,
  defaultHomepageSettings,
  type HomepageRoom,
  type HomepageSettings,
} from "@/lib/homepage";
import HomepageManager from "./HomepageManager";

export const dynamic = "force-dynamic";

export default async function HomepageSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: settings }, { data: rooms }] = await Promise.all([
    supabase.from("homepage_settings").select("*").eq("id", "default").maybeSingle(),
    supabase.from("homepage_rooms").select("*").order("room_code"),
  ]);

  const roomData = defaultHomepageRooms.map(
    (fallback) =>
      (rooms as HomepageRoom[] | null)?.find(
        (room) => room.room_code === fallback.room_code
      ) || fallback
  );

  return (
    <HomepageManager
      initialSettings={(settings as HomepageSettings | null) || defaultHomepageSettings}
      initialRooms={roomData}
    />
  );
}
