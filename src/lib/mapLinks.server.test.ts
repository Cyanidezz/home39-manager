import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveShortMapLink } from "./mapLinks.server";

function redirect(status: number, location?: string) {
  return new Response(null, { status, headers: location ? { location } : {} });
}

afterEach(() => vi.unstubAllGlobals());

describe("resolveShortMapLink", () => {
  const short = "https://maps.app.goo.gl/sk15sFQJ3GmwTghs5";
  const long = "https://www.google.com/maps/search/7.017359,+100.476131?entry=tts";

  it("returns the long URL a share link redirects to, without following it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(redirect(302, long));
    vi.stubGlobal("fetch", fetchMock);
    await expect(resolveShortMapLink(short)).resolves.toBe(long);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
  });

  it("follows one extra short hop", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect(301, "https://goo.gl/maps/abc"))
      .mockResolvedValueOnce(redirect(302, long));
    vi.stubGlobal("fetch", fetchMock);
    await expect(resolveShortMapLink(short)).resolves.toBe(long);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never contacts or accepts non-Google redirect targets", async () => {
    const fetchMock = vi.fn().mockResolvedValue(redirect(302, "https://evil.example/steal"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(resolveShortMapLink(short)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null for non-redirects, missing Location, network errors and loops", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok", { status: 200 })));
    await expect(resolveShortMapLink(short)).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(redirect(302)));
    await expect(resolveShortMapLink(short)).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(resolveShortMapLink(short)).resolves.toBeNull();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(redirect(302, "https://goo.gl/maps/loop")));
    await expect(resolveShortMapLink(short)).resolves.toBeNull();
  });

  it("does not fetch links that are not Google share links", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(resolveShortMapLink("https://evil.example/x")).resolves.toBe("https://evil.example/x");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
