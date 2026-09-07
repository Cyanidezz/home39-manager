export type HomepageSettings = {
  id: string;
  banner_badge: string;
  banner_title: string;
  banner_highlight: string;
  banner_description: string;
  banner_image_url: string | null;
  location_title: string;
  location_description: string;
  map_url: string;
  nearby_place: string;
  nearby_description: string;
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

export const defaultHomepageSettings: HomepageSettings = {
  id: "default",
  banner_badge: "ห้องพักในเมืองหาดใหญ่",
  banner_title: "อยู่สบาย เดินทางสะดวก",
  banner_highlight: "ที่ Home 39",
  banner_description:
    "ตรวจสอบสถานะห้องพัก ดูรายละเอียด และติดต่อสอบถามห้องว่างได้ในหน้าเดียว",
  banner_image_url: null,
  location_title: "เดินทางสะดวกในหาดใหญ่",
  location_description:
    "เปิดแผนที่เพื่อดูเส้นทางมายัง Home 39 และตรวจสอบระยะทางจากตำแหน่งของคุณ",
  map_url: "https://share.google/9SpwEy5eYMnBt4cnd",
  nearby_place: "โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.)",
  nearby_description: "สถานศึกษาสำคัญในพื้นที่หาดใหญ่",
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
