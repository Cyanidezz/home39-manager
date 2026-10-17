"use client";

import { useState } from "react";
import type { DragEvent } from "react";
import HomepageImage from "@/components/HomepageImage";
import Icon from "@/components/Icon";
import { moveItem } from "@/lib/list";

type Props = {
  roomCode: string;
  urls: string[];
  onChange: (urls: string[]) => void;
};

const controlClass =
  "flex h-8 w-8 items-center justify-center rounded-full bg-sand-950/75 text-white hover:bg-brand-600 disabled:opacity-30 disabled:hover:bg-sand-950/75";

/** Photo grid whose order is the order shown on the homepage; drag tiles or use the arrow buttons. */
export default function PhotoGallery({ roomCode, urls, onChange }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

  function onDragStart(event: DragEvent<HTMLDivElement>, index: number) {
    setDragIndex(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function onDrop(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    if (dragIndex !== null) onChange(moveItem(urls, dragIndex, index));
    endDrag();
  }

  return (
    <>
      <p className="mt-1 text-xs text-sand-500">
        ลากรูปเพื่อสลับลำดับ หรือกดปุ่มลูกศรที่รูป ลำดับนี้คือลำดับที่แสดงบนหน้าเว็บ แล้วกด &quot;บันทึกห้อง {roomCode}&quot;
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {urls.map((url, index) => (
          <div
            key={url}
            draggable
            onDragStart={(event) => onDragStart(event, index)}
            onDragOver={(event) => {
              event.preventDefault();
              setOverIndex(index);
            }}
            onDrop={(event) => onDrop(event, index)}
            onDragEnd={endDrag}
            className={`relative cursor-grab overflow-hidden rounded-lg active:cursor-grabbing ${
              dragIndex === index ? "opacity-40" : ""
            } ${
              overIndex === index && dragIndex !== null && dragIndex !== index
                ? "ring-2 ring-brand-500 ring-offset-2"
                : ""
            }`}
          >
            <HomepageImage
              src={url}
              alt={`ห้อง ${roomCode} รูปที่ ${index + 1}`}
              draggable={false}
              className="aspect-[4/3] w-full object-cover"
            />
            <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-sand-950/75 px-2 text-xs font-bold text-white">
              {index + 1}
            </span>
            <button
              type="button"
              aria-label={`เอารูปที่ ${index + 1} ออก`}
              onClick={() => onChange(urls.filter((item) => item !== url))}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-sand-950/75 text-white hover:bg-red-600"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
            <div className="absolute inset-x-2 bottom-2 flex justify-between">
              <button
                type="button"
                aria-label={`เลื่อนรูปที่ ${index + 1} ไปก่อนหน้า`}
                disabled={index === 0}
                onClick={() => onChange(moveItem(urls, index, index - 1))}
                className={controlClass}
              >
                <Icon name="chevronLeft" className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`เลื่อนรูปที่ ${index + 1} ไปถัดไป`}
                disabled={index === urls.length - 1}
                onClick={() => onChange(moveItem(urls, index, index + 1))}
                className={controlClass}
              >
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
