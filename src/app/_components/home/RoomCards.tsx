import HomepageImage from "@/components/HomepageImage";
import type { DisplayRoom } from "./types";

function money(value: number | string) {
  return Number(value || 0).toLocaleString("th-TH");
}

// Rows saved before the crop columns existed come back without them.
function coverCropStyle(room: DisplayRoom) {
  const x = room.cover_image_position_x ?? 50;
  const y = room.cover_image_position_y ?? 50;
  const zoom = room.cover_image_zoom ?? 100;
  return {
    objectPosition: `${x}% ${y}%`,
    transformOrigin: `${x}% ${y}%`,
    transform: `scale(${zoom / 100})`,
  };
}

type Props = {
  rooms: DisplayRoom[];
  onSelect: (room: DisplayRoom) => void;
};

export default function RoomCards({ rooms, onSelect }: Props) {
  return (
    <section id="rooms" className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
          Our rooms
        </p>
        <h2 className="mt-2 text-3xl font-bold">ห้องพัก Home 39</h2>
        <p className="mx-auto mt-3 max-w-xl text-sand-500">
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
              className="group overflow-hidden rounded-2xl border border-sand-200 bg-white text-left shadow-sm hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl"
            >
              <div className="relative flex h-52 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 via-sand-100 to-brand-50">
                {room.cover_image_url ? (
                  <div className="absolute inset-0 transition duration-300 group-hover:scale-105">
                    <HomepageImage
                      src={room.cover_image_url}
                      alt={room.title}
                      className="h-full w-full object-cover"
                      style={coverCropStyle(room)}
                    />
                  </div>
                ) : (
                  <span className="relative rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-brand-700 shadow">
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
                        ? "bg-brand-50 text-brand-700"
                        : "bg-sand-100 text-sand-600"
                    }`}
                  >
                    {vacant ? "ห้องว่าง" : "มีผู้เช่า"}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-sand-500">
                  {room.description}
                </p>
                {Number(room.monthly_price) > 0 && (
                  <p className="mt-4 font-semibold text-brand-700">
                    {money(room.monthly_price)} บาท/เดือน
                  </p>
                )}
                <p className="mt-4 border-t border-sand-100 pt-4 text-sm font-semibold text-brand-600">
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
