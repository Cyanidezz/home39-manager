import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchHomepageContent } from "@/lib/data/settings";
import { defaultHomepageRooms, defaultHomepageSettings } from "@/lib/homepage";
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
    const [roomResult, content] = await Promise.all([
      admin
        .from("rooms")
        .select("room_code, monthly_rent, occupant_count, status")
        .in("room_code", ["A", "B", "C"])
        .order("room_code"),
      fetchHomepageContent(admin),
    ]);

    rooms = roomResult.data || [];
    homepageSettings = content.settings;
    homepageRooms = content.rooms;
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
