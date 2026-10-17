import type { ChangeEvent } from "react";
import ImageCropEditor, { coverFrames } from "./ImageCropEditor";
import PhotoGallery from "./PhotoGallery";
import type { HomepageRoom } from "@/lib/homepage";
import { inputClass } from "./styles";

type Props = {
  /** Room codes with edits that are not saved yet. */
  dirtyRoomCodes: string[];
  rooms: HomepageRoom[];
  saving: boolean;
  uploading: string;
  updateRoom: (roomCode: string, changes: Partial<HomepageRoom>) => void;
  onSaveRoom: (room: HomepageRoom) => void;
  onUploadImages: (roomCode: string, event: ChangeEvent<HTMLInputElement>, cover: boolean) => void;
};

export default function RoomsSection({ dirtyRoomCodes, rooms, saving, uploading, updateRoom, onSaveRoom, onUploadImages }: Props) {
  return (
        <section className="mt-8 rounded-2xl border border-sand-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold">ข้อมูลและรูปภาพห้องพัก</h2>
            <p className="mt-1 text-sm text-sand-500">กำหนดราคาที่แสดง รูปหน้าปกบนการ์ด และรูปเพิ่มเติมของแต่ละห้อง</p>
          </div>
          <div className="space-y-8">
            {rooms.map((room) => (
              <article key={room.room_code} className="rounded-2xl border border-sand-200 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    ห้อง {room.room_code}
                    {dirtyRoomCodes.includes(room.room_code) && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">ยังไม่ได้บันทึก</span>
                    )}
                  </h3>
                  <button type="button" disabled={saving || Boolean(uploading)} onClick={() => onSaveRoom(room)} className="rounded-lg bg-brand-300 px-4 py-2 text-sm font-semibold text-brand-950 hover:bg-brand-400 disabled:opacity-50">
                    บันทึกห้อง {room.room_code}
                  </button>
                </div>
                <div className="mt-5 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-5">
                    <label className="block text-sm font-semibold">ชื่อห้อง
                      <input className={inputClass} value={room.title} onChange={(e) => updateRoom(room.room_code, { title: e.target.value })} required />
                    </label>
                    <label className="block text-sm font-semibold">ราคาห้องต่อเดือน (บาท)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClass}
                        value={room.monthly_price}
                        onChange={(e) => updateRoom(room.room_code, { monthly_price: e.target.value })}
                        required
                      />
                      <span className="mt-2 block text-xs font-normal text-sand-500">
                        ราคานี้แสดงเฉพาะหน้าเว็บไซต์ ไม่เปลี่ยนอัตราค่าเช่าในสัญญา
                      </span>
                    </label>
                    <label className="block text-sm font-semibold">รายละเอียดห้อง
                      <textarea className={`${inputClass} min-h-28`} value={room.description} onChange={(e) => updateRoom(room.room_code, { description: e.target.value })} required />
                    </label>
                  </div>
                  <div>
                    <ImageCropEditor
                      src={room.cover_image_url}
                      alt={`ตัวอย่างรูปหน้าปกห้อง ${room.room_code}`}
                      frames={coverFrames}
                      positionX={room.cover_image_position_x ?? 50}
                      positionY={room.cover_image_position_y ?? 50}
                      zoom={room.cover_image_zoom ?? 100}
                      onPositionXChange={(value) => updateRoom(room.room_code, { cover_image_position_x: value })}
                      onPositionYChange={(value) => updateRoom(room.room_code, { cover_image_position_y: value })}
                      onZoomChange={(value) => updateRoom(room.room_code, { cover_image_zoom: value })}
                    />
                    <label className="mt-3 block cursor-pointer rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-100">
                      {uploading === `${room.room_code}-cover` ? "กำลังอัปโหลด..." : "เลือกรูปหน้าปก"}
                      <input type="file" accept="image/*,.heic,.heif" className="sr-only" disabled={Boolean(uploading)} onChange={(event) => onUploadImages(room.room_code, event, true)} />
                    </label>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold">รูปและวิดีโอเพิ่มเติม ({room.image_urls.length} รายการ)</p>
                    <label className="cursor-pointer rounded-lg border border-sand-300 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                      {uploading === `${room.room_code}-gallery` ? "กำลังอัปโหลด..." : "+ เพิ่มรูป/วิดีโอ"}
                      <input type="file" accept="image/*,.heic,.heif,video/mp4,.mp4" multiple className="sr-only" disabled={Boolean(uploading)} onChange={(event) => onUploadImages(room.room_code, event, false)} />
                    </label>
                  </div>
                  {room.image_urls.length ? (
                    <PhotoGallery
                      roomCode={room.room_code}
                      urls={room.image_urls}
                      onChange={(image_urls) => updateRoom(room.room_code, { image_urls })}
                    />
                  ) : (
                    <p className="mt-4 rounded-xl bg-sand-50 px-4 py-6 text-center text-sm text-sand-500">ยังไม่มีรูปหรือวิดีโอเพิ่มเติม</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
  );
}
