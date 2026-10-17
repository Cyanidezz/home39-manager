import { describe, expect, it } from "vitest";
import {
  MAX_CAPTION_LENGTH,
  MAX_GALLERY_ITEMS,
  normalizeGalleryItems,
} from "./gallery";

describe("normalizeGalleryItems", () => {
  it("keeps valid items", () => {
    expect(
      normalizeGalleryItems([
        { url: "https://x.test/a.jpg", caption: "ห้องครัว" },
        { url: "http://x.test/b.jpg" },
      ])
    ).toEqual([
      { url: "https://x.test/a.jpg", caption: "ห้องครัว" },
      { url: "http://x.test/b.jpg", caption: "" },
    ]);
  });

  it("ignores legacy floor-plan entries", () => {
    expect(
      normalizeGalleryItems([
        { url: "https://x.test/a.jpg", caption: "ห้องครัว", kind: "photo" },
        { url: "https://x.test/p.png", caption: "แปลนชั้น 1", kind: "plan" },
      ])
    ).toEqual([{ url: "https://x.test/a.jpg", caption: "ห้องครัว" }]);
  });

  it("drops malformed entries and non-http URLs", () => {
    expect(
      normalizeGalleryItems([
        null,
        "text",
        42,
        { caption: "no url" },
        { url: "javascript:alert(1)" },
        { url: "not a url" },
        { url: 5 },
      ])
    ).toEqual([]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(normalizeGalleryItems(null)).toEqual([]);
    expect(normalizeGalleryItems({ url: "https://x.test/a.jpg" })).toEqual([]);
    expect(normalizeGalleryItems(undefined)).toEqual([]);
  });

  it("truncates long captions and caps the item count", () => {
    const long = "ก".repeat(MAX_CAPTION_LENGTH + 20);
    expect(normalizeGalleryItems([{ url: "https://x.test/a.jpg", caption: long }])[0].caption).toHaveLength(MAX_CAPTION_LENGTH);
    const many = Array.from({ length: MAX_GALLERY_ITEMS + 5 }, (_, i) => ({ url: `https://x.test/${i}.jpg` }));
    expect(normalizeGalleryItems(many)).toHaveLength(MAX_GALLERY_ITEMS);
  });
});
