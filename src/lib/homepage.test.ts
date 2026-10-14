import { describe, expect, it } from "vitest";
import { googleMapsEmbedUrl, safeHttpUrl } from "./homepage";
import { homepageImageExtension } from "./homepageUpload";

describe("safeHttpUrl", () => {
  it("keeps http and https URLs", () => {
    expect(safeHttpUrl("https://facebook.com/home39")).toBe("https://facebook.com/home39");
    expect(safeHttpUrl("http://example.com/")).toBe("http://example.com/");
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "ftp://x.com", "not a url", ""])(
    "falls back for %o",
    (value) => {
      expect(safeHttpUrl(value)).toBe("#");
      expect(safeHttpUrl(value, "")).toBe("");
    }
  );
});

describe("homepageImageExtension", () => {
  it("maps allowed MIME types", () => {
    expect(homepageImageExtension({ name: "a.JPG", type: "image/jpeg" })).toEqual({ extension: "jpg", contentType: "image/jpeg" });
    expect(homepageImageExtension({ name: "a.png", type: "image/png" })?.extension).toBe("png");
  });

  it("accepts HEIC by extension even without a MIME type", () => {
    expect(homepageImageExtension({ name: "IMG_1.HEIC", type: "" })).toEqual({ extension: "heic", contentType: "image/heic" });
  });

  it("rejects SVG, HTML and unknown types", () => {
    expect(homepageImageExtension({ name: "x.svg", type: "image/svg+xml" })).toBeNull();
    expect(homepageImageExtension({ name: "x.jpg", type: "text/html" })).toBeNull();
    expect(homepageImageExtension({ name: "x", type: "" })).toBeNull();
  });
});

describe("googleMapsEmbedUrl", () => {
  const embed = (value: string) => new URL(googleMapsEmbedUrl(value));

  it("searches by name for the default Home 39 link", () => {
    const url = embed("https://share.google/X6GXLKehq7lfD7DdZ");
    expect(url.searchParams.get("q")).toBe("Home 39 Hatyai");
    expect(url.searchParams.get("z")).toBe("17");
    expect(url.searchParams.get("output")).toBe("embed");
  });

  it("never sends coordinates, which trigger the failing place card", () => {
    for (const value of [
      "https://www.google.com/maps?q=7.0199642,100.4747884",
      "https://www.google.com/maps/place/@7.02,100.47,17z",
      "https://www.google.com/maps/place/7.02,100.47",
    ]) {
      expect(embed(value).searchParams.get("q")).toBe("Home 39 Hatyai");
    }
  });

  it("uses the place name from a /maps/place/ link or ?q= text", () => {
    expect(embed("https://www.google.com/maps/place/Jiranakorn+Stadium/@7.0,100.4,17z").searchParams.get("q")).toBe("Jiranakorn Stadium");
    expect(embed("https://www.google.com/maps?q=Hat+Yai+Hospital").searchParams.get("q")).toBe("Hat Yai Hospital");
  });

  it("falls back for invalid URLs", () => {
    expect(embed("not a url").searchParams.get("q")).toBe("Home 39 Hatyai");
    expect(embed("").searchParams.get("q")).toBe("Home 39 Hatyai");
  });
});
