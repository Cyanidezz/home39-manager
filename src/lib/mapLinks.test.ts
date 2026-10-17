import { describe, expect, it } from "vitest";
import { destinationFromTarget, isShortMapLink } from "./mapLinks";

describe("destinationFromTarget", () => {
  it("reads plain coordinates", () => {
    expect(destinationFromTarget("7.017359,100.476131")).toEqual({ coordinates: "7.017359,100.476131" });
    expect(destinationFromTarget(" 7.017359, 100.476131 ")).toEqual({ coordinates: "7.017359,100.476131" });
  });

  it("reads the resolved form of the school gate link", () => {
    expect(
      destinationFromTarget("https://www.google.com/maps/search/7.017359,+100.476131?entry=tts&g_ep=abc")
    ).toEqual({ coordinates: "7.017359,100.476131" });
  });

  it("reads @lat,lng, !3d!4d and ?q= coordinates", () => {
    expect(destinationFromTarget("https://www.google.com/maps/place/Foo/@7.02,100.47,17z")).toEqual({ coordinates: "7.02,100.47" });
    expect(destinationFromTarget("https://www.google.com/maps/place/Foo/data=!3d7.03!4d100.48")).toEqual({ coordinates: "7.03,100.48" });
    expect(destinationFromTarget("https://www.google.com/maps?q=7.04,100.49")).toEqual({ coordinates: "7.04,100.49" });
  });

  it("falls back to a place name", () => {
    expect(destinationFromTarget("https://www.google.com/maps/place/Hat+Yai+Hospital")).toEqual({ name: "Hat Yai Hospital" });
    expect(destinationFromTarget("https://www.google.com/maps?q=Hat+Yai+Hospital")).toEqual({ name: "Hat Yai Hospital" });
  });

  it("rejects empty text, non-http schemes and unresolvable links", () => {
    expect(destinationFromTarget("")).toBeNull();
    expect(destinationFromTarget("javascript:alert(1)")).toBeNull();
    expect(destinationFromTarget("https://maps.app.goo.gl/sk15sFQJ3GmwTghs5")).toBeNull();
    expect(destinationFromTarget("just words")).toBeNull();
  });
});

describe("isShortMapLink", () => {
  it("accepts Google share links only", () => {
    expect(isShortMapLink("https://maps.app.goo.gl/sk15sFQJ3GmwTghs5")).toBe(true);
    expect(isShortMapLink("https://goo.gl/maps/abc")).toBe(true);
  });

  it("rejects other hosts, schemes and plain text", () => {
    expect(isShortMapLink("https://goo.gl/other")).toBe(false);
    expect(isShortMapLink("http://maps.app.goo.gl/x")).toBe(false);
    expect(isShortMapLink("https://evil.example/maps.app.goo.gl")).toBe(false);
    expect(isShortMapLink("7.0,100.4")).toBe(false);
  });
});
