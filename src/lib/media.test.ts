import { describe, expect, it } from "vitest";
import { isVideoUrl, videoSrc } from "./media";

describe("isVideoUrl", () => {
  it("recognises mp4 URLs regardless of case or query string", () => {
    expect(isVideoUrl("https://x.supabase.co/storage/v1/object/public/homepage-videos/rooms/a/1.mp4")).toBe(true);
    expect(isVideoUrl("https://x.test/clip.MP4?token=1")).toBe(true);
  });

  it("treats images and other URLs as images", () => {
    expect(isVideoUrl("https://x.test/photo.jpg")).toBe(false);
    expect(isVideoUrl("https://x.test/photo.heic")).toBe(false);
    expect(isVideoUrl("https://x.test/mp4/photo.jpg")).toBe(false);
    expect(isVideoUrl("not a url")).toBe(false);
  });
});

describe("videoSrc", () => {
  it("adds a first-frame fragment once", () => {
    expect(videoSrc("https://x.test/a.mp4")).toBe("https://x.test/a.mp4#t=0.1");
    expect(videoSrc("https://x.test/a.mp4#t=2")).toBe("https://x.test/a.mp4#t=2");
  });
});
