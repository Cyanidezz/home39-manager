import { createAdminClient } from "@/lib/supabase/admin";
import HomePage from "./HomePage";

export const dynamic = "force-dynamic";

export default async function Home() {
  let rooms: {
    room_code: string;
    monthly_rent: number | string;
    occupant_count: number;
    status: string;
  }[] = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("rooms")
      .select("room_code, monthly_rent, occupant_count, status")
      .in("room_code", ["A", "B", "C"])
      .order("room_code");

    rooms = data || [];
  } catch (error) {
    console.error("Load public room status failed:", error);
  }

  return <HomePage rooms={rooms} />;
}
