"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import HomepageImage from "@/components/HomepageImage";
import Icon from "@/components/Icon";
import type { GalleryItem } from "@/lib/gallery";
import { useModal } from "@/lib/useModal";
import type { HomepageSettings } from "@/lib/homepage";

type Props = { settings: HomepageSettings };

function Lightbox({
  items,
  index,
  onChange,
  onClose,
}: {
  items: GalleryItem[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useModal<HTMLDivElement>(onClose);
  const item = items[index];
  const hasMany = items.length > 1;
  const previous = () => onChange((index - 1 + items.length) % items.length);
  const next = () => onChange((index + 1) % items.length);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (items.length < 2) return;
      if (event.key === "ArrowLeft") onChange((index - 1 + items.length) % items.length);
      if (event.key === "ArrowRight") onChange((index + 1) % items.length);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, items.length, onChange]);

  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  const navButton =
    "absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brand-900 shadow hover:bg-white";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sand-950/80 p-3 sm:p-6"
      onMouseDown={closeOnBackdrop}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={item.caption || "ภาพขยาย"}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-5xl flex-col outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="absolute -top-1 right-0 z-10 flex h-10 w-10 -translate-y-full items-center justify-center rounded-full bg-white/90 text-brand-900 hover:bg-white sm:translate-y-0"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-white/5">
          <HomepageImage
            src={item.url}
            alt={item.caption || "ภาพหอพัก"}
            className="max-h-[78vh] w-full object-contain"
          />
          {hasMany && (
            <>
              <button type="button" aria-label="ภาพก่อนหน้า" onClick={previous} className={`${navButton} left-3`}>
                <Icon name="chevronLeft" className="h-5 w-5" />
              </button>
              <button type="button" aria-label="ภาพถัดไป" onClick={next} className={`${navButton} right-3`}>
                <Icon name="chevronRight" className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        <p className="mt-3 text-center text-sm text-white">
          {item.caption && <span className="font-semibold">{item.caption}</span>}
          {hasMany && (
            <span className="ml-2 text-white/70">
              {index + 1} / {items.length}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function GallerySection({ settings }: Props) {
  const photos = settings.gallery_items;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const hasHeader = Boolean(settings.gallery_title || settings.gallery_description);

  return (
    <section id="gallery" className="border-t border-sand-200 bg-sand-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        {hasHeader && (
          <div className="mb-10 text-center">
            {settings.gallery_title && <h2 className="text-3xl font-bold">{settings.gallery_title}</h2>}
            {settings.gallery_description && (
              <p className="mx-auto mt-3 max-w-xl text-sand-500">{settings.gallery_description}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {photos.map((item, index) => {
            const featured = index === 0 && photos.length > 2;
            return (
              <button
                key={`${item.url}-${index}`}
                type="button"
                onClick={() => setOpenIndex(index)}
                className={`group relative overflow-hidden rounded-2xl border border-sand-200 bg-sand-100 text-left shadow-sm ${
                  featured ? "col-span-2 row-span-2 aspect-square sm:aspect-auto lg:min-h-[420px]" : "aspect-[4/3]"
                }`}
              >
                <HomepageImage
                  src={item.url}
                  alt={item.caption || "ภาพหอพัก"}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                {item.caption && (
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sand-950/70 to-transparent px-4 pb-3 pt-10 text-sm font-semibold text-white">
                    {item.caption}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {openIndex !== null && (
        <Lightbox
          items={photos}
          index={openIndex}
          onChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </section>
  );
}
