export type MapDestination = { coordinates: string } | { name: string };

const number = String.raw`-?\d{1,3}(?:\.\d+)?`;
const coordinatePair = new RegExp(`^\\s*(${number})\\s*,\\s*\\+?\\s*(${number})\\s*$`);
const coordinateAnywhere = new RegExp(`(${number}),\\s*\\+?\\s*(${number})`);

const shortLinkHosts = new Set(["maps.app.goo.gl", "goo.gl"]);

export function isShortMapLink(target: string) {
  try {
    const url = new URL(target);
    return (
      url.protocol === "https:" &&
      shortLinkHosts.has(url.hostname) &&
      (url.hostname !== "goo.gl" || url.pathname.startsWith("/maps"))
    );
  } catch {
    return false;
  }
}

/**
 * Reads a route destination from admin-entered text: plain "lat,lng", or a
 * (resolved) Google Maps URL carrying coordinates or a place name.
 * Short links must be resolved first (see `resolveShortMapLink`).
 */
export function destinationFromTarget(target: string): MapDestination | null {
  const text = target.trim();
  if (!text) return null;

  const pair = text.match(coordinatePair);
  if (pair) return { coordinates: `${pair[1]},${pair[2]}` };

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const path = decodeURIComponent(url.pathname);
  const viewport = path.match(new RegExp(`@(${number}),(${number})`));
  if (viewport) return { coordinates: `${viewport[1]},${viewport[2]}` };

  const data = path.match(new RegExp(`!3d(${number})!4d(${number})`));
  if (data) return { coordinates: `${data[1]},${data[2]}` };

  const search = path.match(/\/maps\/search\/([^/]+)/)?.[1];
  const query = url.searchParams.get("query") || url.searchParams.get("q") || search || "";
  const queryPair = query.match(coordinateAnywhere);
  if (queryPair && coordinatePair.test(query)) {
    return { coordinates: `${queryPair[1]},${queryPair[2]}` };
  }

  const placeName = path.match(/\/maps\/place\/([^/@]+)/)?.[1];
  const name = (query && !coordinatePair.test(query) ? query : placeName?.replaceAll("+", " ")) || "";
  return name ? { name } : null;
}
