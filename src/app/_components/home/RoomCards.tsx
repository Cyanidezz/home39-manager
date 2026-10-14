import HomepageImage from "@/components/HomepageImage";
import type { DisplayRoom } from "./types";

function money(value: number | string) {
  return Number(value || 0).toLocaleString("th-TH");
}

type Props = {
  rooms: DisplayRoom[];
  onSelect: (room: DisplayRoom) => void;
};

export default function RoomCards({ rooms, onSelect }: Props) {
  return (
    <section id="rooms" className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Our rooms
        </p>
        <h2 className="mt-2 text-3xl font-bold">ห้องพัก Home 39</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          เลือกห้องเพื่อดูรายละเอียด สถานะ และรูปภาพเพิ่มเติม
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {rooms.map((room) => {
          const vacant = room.status !== "occupied";
          return (
            <button
              key={room.room_code}
              type="button"
              onClick={() => onSelect(room)}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl"
            >
              <div className="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 via-slate-100 to-blue-50">
                {room.cover_image_url ? (
                  <HomepageImage
                    src={room.cover_image_url}
                    alt={room.title}
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="relative rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow">
                    รูปห้อง {room.room_code}
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold">{room.title}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      vacant
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {vacant ? "ห้องว่าง" : "มีผู้เช่า"}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                  {room.description}
                </p>
                {Number(room.monthly_price) > 0 && (
                  <p className="mt-4 font-semibold text-blue-700">
                    {money(room.monthly_price)} บาท/เดือน
                  </p>
                )}
                <p className="mt-4 border-t border-slate-100 pt-4 text-sm font-semibold text-blue-600">
                  ดูรายละเอียดและรูปภาพ →
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
