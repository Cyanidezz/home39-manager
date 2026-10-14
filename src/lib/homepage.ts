export type HomepageSettings = {
  id: string;
  banner_badge: string;
  banner_title: string;
  banner_highlight: string;
  banner_description: string;
  banner_image_url: string | null;
  banner_image_position_x: number;
  banner_image_position_y: number;
  banner_image_zoom: number;
  location_title: string;
  location_description: string;
  map_url: string;
  nearby_places: string[];
  contact_title: string;
  contact_description: string;
  facebook_url: string;
  line_id: string;
  line_url: string;
  phone_primary: string;
  phone_secondary: string;
};

export type HomepageRoom = {
  room_code: string;
  title: string;
  description: string;
  monthly_price: number | string;
  cover_image_url: string | null;
  image_urls: string[];
};

export function homepageImageDisplayUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (
      supabaseUrl &&
      url.origin === new URL(supabaseUrl).origin &&
      url.pathname.startsWith("/storage/v1/object/public/homepage/") &&
      /\.(heic|heif)$/i.test(url.pathname)
    ) {
      return `/api/homepage-image?url=${encodeURIComponent(url.toString())}`;
    }
  } catch {
    return imageUrl;
  }

  return imageUrl;
}

/** Returns the URL only when it is http(s); blocks javascript:/data: links saved in settings. */
export function safeHttpUrl(value: string, fallback = "#") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

const coordinatePattern = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** Pulls "lat,lng" out of a Google Maps URL (?q=, @lat,lng, or !3d..!4d..), if present. */
function coordinatesFromMapUrl(url: URL) {
  const query = url.searchParams.get("query") || url.searchParams.get("q") || "";
  const fromQuery = query.match(coordinatePattern);
  if (fromQuery) return `${fromQuery[1]},${fromQuery[2]}`;

  const at = decodeURIComponent(url.pathname).match(/@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/);
  if (at) return `${at[1]},${at[2]}`;

  const data = url.pathname.match(/!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/);
  if (data) return `${data[1]},${data[2]}`;

  return null;
}

export function googleMapsEmbedUrl(mapUrl: string) {
  const defaultCoordinates = "7.0199642,100.4747884";
  let coordinates: string | null = defaultCoordinates;
  let placeName: string | null = null;

  try {
    const url = new URL(mapUrl);
    coordinates = coordinatesFromMapUrl(url);
    if (!coordinates) {
      const query = url.searchParams.get("query") || url.searchParams.get("q");
      const placeSlug = url.pathname.match(/\/maps\/place\/([^/@]+)/)?.[1];
      placeName =
        query || (placeSlug ? decodeURIComponent(placeSlug.replaceAll("+", " ")) : null);
      if (!placeName) coordinates = defaultCoordinates;
    }
  } catch {
    coordinates = defaultCoordinates;
  }

  // A bare "lat,lng" query makes the embed try to load a place card, which fails
  // with "Place info couldn't load". The loc: prefix drops a plain pin instead.
  const query = coordinates ? `loc:${coordinates}` : placeName!;
  const zoom = coordinates ? "&z=17" : "";
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}${zoom}&output=embed`;
}

export const defaultHomepageSettings: HomepageSettings = {
  id: "default",
  banner_badge: "ห้องพักในเมืองหาดใหญ่",
  banner_title: "อยู่สบาย เดินทางสะดวก",
  banner_highlight: "ที่ Home 39",
  banner_description:
    "ตรวจสอบสถานะห้องพัก ดูรายละเอียด และติดต่อสอบถามห้องว่างได้ในหน้าเดียว",
  banner_image_url: null,
  banner_image_position_x: 50,
  banner_image_position_y: 50,
  banner_image_zoom: 100,
  location_title: "เดินทางสะดวกในหาดใหญ่",
  location_description:
    "เปิดแผนที่เพื่อดูเส้นทางมายัง Home 39 และตรวจสอบระยะทางจากตำแหน่งของคุณ",
  map_url: "https://share.google/X6GXLKehq7lfD7DdZ",
  nearby_places: ["โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.)"],
  contact_title: "สนใจจองห้องพัก?",
  contact_description:
    "ติดต่อสอบถามสถานะห้อง ราคา และรายละเอียดเพิ่มเติมได้ทุกช่องทาง",
  facebook_url: "https://www.facebook.com/home39hdy",
  line_id: "@069jzotj",
  line_url: "https://line.me/R/ti/p/%40069jzotj",
  phone_primary: "087-0954441",
  phone_secondary: "089-4644898",
};

const roomDescriptions: Record<string, string> = {
  A: "ห้องพักส่วนตัว บรรยากาศสงบ เหมาะสำหรับพักอาศัยระยะยาว",
  B: "ห้องพักสะดวกสบาย ในทำเลเดินทางง่ายใจกลางหาดใหญ่",
  C: "พื้นที่พักอาศัยเป็นสัดส่วน พร้อมติดต่อสอบถามรายละเอียดเพิ่มเติม",
};

export const defaultHomepageRooms: HomepageRoom[] = ["A", "B", "C"].map(
  (roomCode) => ({
    room_code: roomCode,
    title: `ห้อง ${roomCode}`,
    description: roomDescriptions[roomCode],
    monthly_price: roomCode === "A" ? 5000 : 4500,
    cover_image_url: null,
    image_urls: [],
  })
);
