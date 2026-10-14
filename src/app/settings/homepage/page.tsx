import { requireUser } from "@/lib/data/session";
import { fetchHomepageContent } from "@/lib/data/settings";
import HomepageManager from "./HomepageManager";

export const dynamic = "force-dynamic";

export default async function HomepageSettingsPage() {
  const { supabase } = await requireUser();

  const { settings, rooms } = await fetchHomepageContent(supabase);

  return (
    <HomepageManager
      initialSettings={settings}
      initialRooms={rooms}
    />
  );
}
