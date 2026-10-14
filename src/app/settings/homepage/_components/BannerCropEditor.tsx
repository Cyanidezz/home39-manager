import HomepageImage from "@/components/HomepageImage";

export default function BannerCropEditor({
  src,
  positionX,
  positionY,
  zoom,
  onPositionXChange,
  onPositionYChange,
  onZoomChange,
}: {
  src: string | null;
  positionX: number;
  positionY: number;
  zoom: number;
  onPositionXChange: (value: number) => void;
  onPositionYChange: (value: number) => void;
  onZoomChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="relative aspect-[16/7] overflow-hidden rounded-xl border border-sand-200 bg-sand-100">
        {src ? (
          <HomepageImage
            src={src}
            alt="ตัวอย่างการ crop รูป Banner"
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${positionX}% ${positionY}%`,
              transform: `scale(${zoom / 100})`,
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-sand-400">
            ยังไม่มีรูปภาพ
          </div>
        )}
      </div>
      <div className="mt-4 space-y-4">
        <label className="block text-sm font-semibold">
          ตำแหน่งแนวนอน <span className="font-normal text-sand-500">{positionX}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={positionX}
            onChange={(event) => onPositionXChange(Number(event.target.value))}
            className="mt-2 w-full accent-brand-600"
            aria-label="ตำแหน่งภาพแนวนอน"
          />
        </label>
        <label className="block text-sm font-semibold">
          ตำแหน่งแนวตั้ง <span className="font-normal text-sand-500">{positionY}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={positionY}
            onChange={(event) => onPositionYChange(Number(event.target.value))}
            className="mt-2 w-full accent-brand-600"
            aria-label="ตำแหน่งภาพแนวตั้ง"
          />
        </label>
        <label className="block text-sm font-semibold">
          ซูม <span className="font-normal text-sand-500">{zoom}%</span>
          <input
            type="range"
            min="100"
            max="200"
            step="5"
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            className="mt-2 w-full accent-brand-600"
            aria-label="ซูมรูป Banner"
          />
        </label>
      </div>
    </div>
  );
}
