/** Photos and floor plans for the homepage "ภาพรวมและส่วนกลาง" section (stored as jsonb). */
export type GalleryItem = {
  url: string;
  caption: string;
  /** "photo" fills a cropped tile; "plan" is shown uncropped in the floor-plan row. */
  kind: "photo" | "plan";
};

export const MAX_GALLERY_ITEMS = 24;
export const MAX_CAPTION_LENGTH = 80;

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Defensive read of the jsonb column: drops malformed entries instead of throwing. */
export function normalizeGalleryItems(value: unknown): GalleryItem[] {
  if (!Array.isArray(value)) return [];
  const items: GalleryItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { url, caption, kind } = entry as Record<string, unknown>;
    if (!isHttpUrl(url)) continue;
    items.push({
      url,
      caption: typeof caption === "string" ? caption.slice(0, MAX_CAPTION_LENGTH) : "",
      kind: kind === "plan" ? "plan" : "photo",
    });
    if (items.length >= MAX_GALLERY_ITEMS) break;
  }
  return items;
}

/** Order the lightbox walks through: all photos first, then plans, each keeping admin order. */
export function displayOrder(items: GalleryItem[]) {
  return [
    ...items.filter((item) => item.kind === "photo"),
    ...items.filter((item) => item.kind === "plan"),
  ];
}
