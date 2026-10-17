import { isShortMapLink } from "./mapLinks";

// Server-side only: it performs outbound fetches (called from the homepage server component).
const MAX_HOPS = 3;
const googleHosts = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "www.google.com",
  "google.com",
  "maps.google.com",
]);

/**
 * Follows a Google Maps share link's redirects (without fetching the final
 * page) and returns the long URL it points to, or null. Only Google hosts are
 * contacted, redirects are never followed automatically, and results are cached
 * for a day.
 */
export async function resolveShortMapLink(link: string) {
  let current = link;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (!isShortMapLink(current)) return current;

    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(4000),
        next: { revalidate: 86400 },
      });
    } catch {
      return null;
    }

    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) return null;

    let next: URL;
    try {
      next = new URL(location, current);
    } catch {
      return null;
    }
    if (next.protocol !== "https:" || !googleHosts.has(next.hostname)) return null;
    current = next.toString();
  }

  return null;
}
