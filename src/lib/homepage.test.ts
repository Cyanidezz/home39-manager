import { describe, expect, it } from "vitest";
import {
  googleMapsDirectionsEmbedUrl,
  googleMapsDirectionsLink,
  googleMapsEmbedUrl,
  parseNearbyPlace,
  safeHttpUrl,
} from "./homepage";
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

describe("parseNearbyPlace", () => {
  it("strips the abbreviation and reads metres", () => {
    expect(parseNearbyPlace("โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.) 200 ม.")).toEqual({
      label: "โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.) 200 ม.",
      name: "โรงเรียนหาดใหญ่วิทยาลัย",
      meters: 200,
      target: null,
    });
  });

  it("reads kilometres as metres", () => {
    expect(parseNearbyPlace("มหาวิทยาลัยสงขลานครินทร์ 4.5 กม.")).toMatchObject({
      name: "มหาวิทยาลัยสงขลานครินทร์",
      meters: 4500,
    });
    expect(parseNearbyPlace("Airport 12 km")).toMatchObject({ name: "Airport", meters: 12000 });
  });

  it("keeps text without a distance", () => {
    expect(parseNearbyPlace("แบงค์ชาติ")).toMatchObject({ name: "แบงค์ชาติ", meters: null, target: null });
    expect(parseNearbyPlace("  ")).toMatchObject({ name: "", meters: null });
  });

  it("splits an optional route target after |", () => {
    expect(
      parseNearbyPlace("โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.) 400 ม. | https://maps.app.goo.gl/sk15sFQJ3GmwTghs5")
    ).toEqual({
      label: "โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.) 400 ม.",
      name: "โรงเรียนหาดใหญ่วิทยาลัย",
      meters: 400,
      target: "https://maps.app.goo.gl/sk15sFQJ3GmwTghs5",
    });
    expect(parseNearbyPlace("ประตู 2 300 ม. | 7.017359,100.476131").target).toBe("7.017359,100.476131");
  });
});

describe("directions to coordinates", () => {
  it("routes to an exact point", () => {
    const url = new URL(googleMapsDirectionsEmbedUrl({ coordinates: "7.017359,100.476131" }, 400));
    expect(url.searchParams.get("daddr")).toBe("7.017359,100.476131");
    expect(url.searchParams.get("dirflg")).toBe("w");
    const link = new URL(googleMapsDirectionsLink({ coordinates: "7.017359,100.476131" }, 400));
    expect(link.searchParams.get("destination")).toBe("7.017359,100.476131");
  });
});

describe("directions URLs", () => {
  const embed = (name: string, meters: number | null) =>
    new URL(googleMapsDirectionsEmbedUrl(name, meters));

  it("routes from Home 39 by name and walks short distances", () => {
    const url = embed("โรงเรียนหาดใหญ่วิทยาลัย", 200);
    expect(url.searchParams.get("saddr")).toBe("Home 39 Hatyai");
    expect(url.searchParams.get("daddr")).toBe("โรงเรียนหาดใหญ่วิทยาลัย");
    expect(url.searchParams.get("dirflg")).toBe("w");
    expect(url.searchParams.get("output")).toBe("embed");
  });

  it("drives long or unknown distances and adds the city for disambiguation", () => {
    const far = embed("มหาวิทยาลัยสงขลานครินทร์", 4500);
    expect(far.searchParams.get("dirflg")).toBeNull();
    expect(far.searchParams.get("daddr")).toBe("มหาวิทยาลัยสงขลานครินทร์ หาดใหญ่");
    expect(embed("แบงค์ชาติ", null).searchParams.get("dirflg")).toBeNull();
  });

  it("builds a matching Google Maps link", () => {
    const link = new URL(googleMapsDirectionsLink("แบงค์ชาติ", 150));
    expect(link.origin + link.pathname).toBe("https://www.google.com/maps/dir/");
    expect(link.searchParams.get("origin")).toBe("Home 39 Hatyai");
    expect(link.searchParams.get("destination")).toBe("แบงค์ชาติ หาดใหญ่");
    expect(link.searchParams.get("travelmode")).toBe("walking");
  });
});
