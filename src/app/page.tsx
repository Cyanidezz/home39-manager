import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchHomepageContent } from "@/lib/data/settings";
import { defaultHomepageRooms, defaultHomepageSettings, parseNearbyPlace } from "@/lib/homepage";
import { destinationFromTarget, isShortMapLink, type MapDestination } from "@/lib/mapLinks";
import { resolveShortMapLink } from "@/lib/mapLinks.server";
import HomePage from "./HomePage";

/** Route destinations pinned by admins after "|" in a nearby place, keyed by the raw target text. */
async function resolveNearbyDestinations(places: string[]) {
  const destinations: Record<string, MapDestination> = {};
  await Promise.all(
    places.map(async (text) => {
      const target = parseNearbyPlace(text).target;
      if (!target) return;
      const resolved = isShortMapLink(target) ? await resolveShortMapLink(target) : target;
      const destination = resolved ? destinationFromTarget(resolved) : null;
      if (destination) destinations[target] = destination;
    })
  );
  return destinations;
}

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
      nearbyDestinations={await resolveNearbyDestinations(homepageSettings.nearby_places)}
    />
  );
}
