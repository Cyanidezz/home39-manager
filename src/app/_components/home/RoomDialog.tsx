import HomepageImage from "@/components/HomepageImage";
import type { HomepageSettings } from "@/lib/homepage";
import type { DisplayRoom } from "./types";

function money(value: number | string) {
  return Number(value || 0).toLocaleString("th-TH");
}

type Props = {
  room: DisplayRoom;
  settings: HomepageSettings;
  onClose: () => void;
};

export default function RoomDialog({ room, settings, onClose }: Props) {
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true">
        <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
            <div>
              <h2 className="text-2xl font-bold">{room.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {room.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onClose()}
              className="text-2xl text-slate-400 hover:text-slate-700"
              aria-label="ปิด"
            >
              ×
            </button>
          </div>

          <div className="p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {(room.image_urls.length
                ? room.image_urls
                : ["", "", "", ""]
              ).map((imageUrl, index) => (
                  <div
                    key={imageUrl || index}
                    className="flex aspect-[4/3] items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-100"
                  >
                    {imageUrl ? (
                      <HomepageImage
                        src={imageUrl}
                        alt={`${room.title} รูปที่ ${index + 1}`}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <span className="text-4xl">🛏️</span>
                        <p className="mt-3 text-sm font-semibold text-blue-700">
                          รูปห้อง {room.room_code}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">ภาพที่ {index + 1}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">สถานะ</p>
                <p className="mt-1 font-semibold text-blue-700">
                  {room.status === "occupied" ? "มีผู้เช่า" : "ห้องว่าง"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">ค่าเช่ารายเดือน</p>
                <p className="mt-1 font-semibold">
                  {Number(room.monthly_price) > 0
                    ? `${money(room.monthly_price)} บาท`
                    : "กรุณาสอบถาม"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">สอบถามเพิ่มเติม</p>
                <a href={`tel:${settings.phone_primary.replace(/\D/g, "")}`} className="mt-1 block font-semibold text-blue-700">
                  {settings.phone_primary}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
