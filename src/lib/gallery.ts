/** Photos for the homepage section shown after the rooms (stored as jsonb). */
export type GalleryItem = {
  url: string;
  caption: string;
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

/**
 * Defensive read of the jsonb column: drops malformed entries instead of throwing.
 * Entries saved by the earlier floor-plan feature (`kind: "plan"`) are ignored.
 */
export function normalizeGalleryItems(value: unknown): GalleryItem[] {
  if (!Array.isArray(value)) return [];
  const items: GalleryItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { url, caption, kind } = entry as Record<string, unknown>;
    if (kind === "plan" || !isHttpUrl(url)) continue;
    items.push({
      url,
      caption: typeof caption === "string" ? caption.slice(0, MAX_CAPTION_LENGTH) : "",
    });
    if (items.length >= MAX_GALLERY_ITEMS) break;
  }
  return items;
}
