import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./homepage";
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
