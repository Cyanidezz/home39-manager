import type { HomepageRoom } from "@/lib/homepage";

export type Room = {
  room_code: string;
  monthly_rent: number | string;
  occupant_count: number;
  status: string;
};

export type DisplayRoom = Room & HomepageRoom;
