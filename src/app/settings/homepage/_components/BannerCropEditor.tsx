"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import HomepageImage from "@/components/HomepageImage";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampPercent,
  clampZoom,
  coverOverflow,
  positionAfterDrag,
} from "@/lib/bannerCrop";

type Props = {
  src: string | null;
  positionX: number;
  positionY: number;
  zoom: number;
  onPositionXChange: (value: number) => void;
  onPositionYChange: (value: number) => void;
  onZoomChange: (value: number) => void;
};

type View = "desktop" | "mobile";

// Approximate shapes of the real hero: wide on desktop, tall on a phone.
const frames: Record<View, { label: string; className: string }> = {
  desktop: { label: "คอมพิวเตอร์", className: "aspect-[8/3] w-full" },
  mobile: { label: "มือถือ", className: "mx-auto aspect-[5/6] w-full max-w-[260px]" },
};

type DragStart = {
  pointerX: number;
  pointerY: number;
  positionX: number;
  positionY: number;
  frameWidth: number;
  frameHeight: number;
};

export default function BannerCropEditor({
  src,
  positionX,
  positionY,
  zoom,
  onPositionXChange,
  onPositionYChange,
  onZoomChange,
}: Props) {
  const [view, setView] = useState<View>("desktop");
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const naturalSize = useRef<{ width: number; height: number } | null>(null);
  const dragStart = useRef<DragStart | null>(null);

  function overflowFor(frameWidth: number, frameHeight: number) {
    const size = naturalSize.current;
    return size
      ? coverOverflow(frameWidth, frameHeight, size.width, size.height)
      : { x: 0, y: 0 };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!src || !frameRef.current) return;
    if (!naturalSize.current) {
      // onLoad can fire before hydration for a cached image; read the size directly.
      const image = frameRef.current.querySelector("img");
      if (image?.complete && image.naturalWidth > 0) {
        naturalSize.current = { width: image.naturalWidth, height: image.naturalHeight };
      }
    }
    const rect = frameRef.current.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      positionX,
      positionY,
      frameWidth: rect.width,
      frameHeight: rect.height,
    };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start) return;
    const overflow = overflowFor(start.frameWidth, start.frameHeight);
    onPositionXChange(
      clampPercent(
        positionAfterDrag(
          start.positionX,
          event.clientX - start.pointerX,
          start.frameWidth,
          overflow.x,
          zoom
        )
      )
    );
    onPositionYChange(
      clampPercent(
        positionAfterDrag(
          start.positionY,
          event.clientY - start.pointerY,
          start.frameHeight,
          overflow.y,
          zoom
        )
      )
    );
  }

  function endDrag() {
    dragStart.current = null;
    setDragging(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2;
    // Arrow keys move the picture in the arrow's direction, like dragging it.
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    onPositionXChange(clampPercent(positionX + move[0]));
    onPositionYChange(clampPercent(positionY + move[1]));
  }

  function reset() {
    onPositionXChange(50);
    onPositionYChange(50);
    onZoomChange(MIN_ZOOM);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div role="group" aria-label="มุมมองตัวอย่าง" className="inline-flex rounded-lg border border-sand-200 p-0.5">
          {(Object.keys(frames) as View[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                view === key ? "bg-brand-200 text-brand-900" : "text-sand-500 hover:text-brand-700"
              }`}
            >
              {frames[key].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={!src}
          className="text-sm font-semibold text-brand-700 hover:underline disabled:opacity-40"
        >
          รีเซ็ตตำแหน่ง
        </button>
      </div>

      <div
        ref={frameRef}
        role="application"
        aria-label="ตัวอย่าง Banner ลากเพื่อเลื่อนรูป หรือใช้ปุ่มลูกศร"
        tabIndex={src ? 0 : -1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={`relative touch-none select-none overflow-hidden rounded-xl border border-sand-200 bg-sand-100 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
          frames[view].className
        } ${src ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
      >
        {src ? (
          <>
            <HomepageImage
              src={src}
              alt="ตัวอย่างตำแหน่งรูป Banner"
              draggable={false}
              onLoad={(event) => {
                const image = event.currentTarget;
                naturalSize.current = {
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                };
              }}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: `${positionX}% ${positionY}%`,
                transformOrigin: `${positionX}% ${positionY}%`,
                transform: `scale(${zoom / 100})`,
              }}
            />
            {!dragging && (
              <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-sand-950/55 px-3 py-1 text-xs font-medium text-white">
                ลากเพื่อเลื่อนรูป
              </span>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-sand-400">
            ยังไม่มีรูปภาพ
          </div>
        )}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-semibold">
          ซูม <span className="font-normal text-sand-500">{zoom}%</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="5"
            value={zoom}
            onChange={(event) => onZoomChange(clampZoom(Number(event.target.value)))}
            className="mt-2 w-full accent-brand-600"
            aria-label="ซูมรูป Banner"
          />
        </label>
        <p className="mt-2 text-xs text-sand-500">
          ลากรูปในกรอบเพื่อเลือกส่วนที่จะแสดง (หรือกดลูกศรบนแป้นพิมพ์ แล้วใช้ Shift เพื่อเลื่อนเร็วขึ้น)
          ตำแหน่งเดียวกันใช้ทั้งคอมพิวเตอร์และมือถือ สลับมุมมองเพื่อตรวจทั้งสองแบบ
        </p>
      </div>
    </div>
  );
}
