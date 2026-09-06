import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  defaultHomepageRooms,
  defaultHomepageSettings,
  type HomepageRoom,
  type HomepageSettings,
} from "@/lib/homepage";
import HomePage from "./HomePage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rooms: {
    room_code: string;
    monthly_rent: number | string;
    occupant_count: number;
    status: string;
  }[] = [];
  let homepageSettings = defaultHomepageSettings;
  let homepageRooms = defaultHomepageRooms;

  try {
    const admin = createAdminClient();
    const [roomResult, settingsResult, homepageRoomResult] = await Promise.all([
      admin
        .from("rooms")
        .select("room_code, monthly_rent, occupant_count, status")
        .in("room_code", ["A", "B", "C"])
        .order("room_code"),
      admin.from("homepage_settings").select("*").eq("id", "default").maybeSingle(),
      admin.from("homepage_rooms").select("*").order("room_code"),
    ]);

    rooms = roomResult.data || [];
    homepageSettings =
      (settingsResult.data as HomepageSettings | null) || defaultHomepageSettings;
    homepageRooms = defaultHomepageRooms.map(
      (fallback) =>
        (homepageRoomResult.data as HomepageRoom[] | null)?.find(
          (item) => item.room_code === fallback.room_code
        ) || fallback
    );
  } catch (error) {
    console.error("Load public room status failed:", error);
  }

  return (
    <HomePage
      rooms={rooms}
      isLoggedIn={Boolean(user)}
      settings={homepageSettings}
      homepageRooms={homepageRooms}
    />
  );
}
