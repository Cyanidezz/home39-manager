// Fake data for the visual-QA mock. Nothing here comes from production.
const now = new Date();
const year = now.getUTCFullYear();
const month = now.getUTCMonth() + 1;
const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
const pad = (n) => String(n).padStart(2, "0");
const day = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const user = {
  id: uuid(1),
  aud: "authenticated",
  role: "authenticated",
  email: "test@example.com",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};

const rooms = [
  { id: uuid(11), room_code: "A", monthly_rent: 4500, occupant_count: 1, status: "occupied", note: null },
  { id: uuid(12), room_code: "B", monthly_rent: 5000, occupant_count: 1, status: "occupied", note: null },
  { id: uuid(13), room_code: "C", monthly_rent: 4500, occupant_count: 0, status: "vacant", note: null },
  { id: uuid(14), room_code: "D", monthly_rent: 4800, occupant_count: 0, status: "vacant", note: null },
];

const tenants = [
  {
    id: uuid(21), room_id: rooms[0].id, full_name: "ตัวอย่าง ผู้เช่า A", phone: "081-000-0001",
    move_in_date: day(year, 3, 1), move_out_date: null, is_active: true, note: null,
    termination_notice_date: null, planned_move_out_date: null,
    advance_rent_amount: 4500, deposit_amount: 9000, initial_electricity_meter: 120,
    rent_waived_year: null, rent_waived_month: null, line_user_id: null,
  },
  {
    id: uuid(22), room_id: rooms[1].id, full_name: "ตัวอย่าง ผู้เช่า B", phone: "081-000-0002",
    move_in_date: day(year - 1, 8, 15), move_out_date: null, is_active: true, note: "ย้ายออกสิ้นเดือนหน้า",
    termination_notice_date: day(year, month, 1), planned_move_out_date: day(year, month + 1 > 12 ? 12 : month + 1, 28),
    advance_rent_amount: 5000, deposit_amount: 10000, initial_electricity_meter: 340,
    rent_waived_year: year, rent_waived_month: month, line_user_id: "U-mock-line",
  },
  // Moved out, deposit settlement not started (room C) and saved but not yet transferred (room D).
  {
    id: uuid(23), room_id: rooms[2].id, full_name: "ตัวอย่าง ผู้เช่าเดิม C", phone: "081-000-0003",
    move_in_date: day(year - 1, 2, 1), move_out_date: day(year, month, 1), is_active: false, note: null,
    termination_notice_date: day(year, month - 1 < 1 ? 1 : month - 1, 1), planned_move_out_date: day(year, month, 1),
    advance_rent_amount: 4500, deposit_amount: 9000, initial_electricity_meter: 60,
    rent_waived_year: year, rent_waived_month: month - 1 < 1 ? 1 : month - 1, line_user_id: null,
  },
  {
    id: uuid(24), room_id: rooms[3].id, full_name: "ตัวอย่าง ผู้เช่าเดิม D", phone: "081-000-0004",
    move_in_date: day(year - 1, 5, 1), move_out_date: day(year, month, 2), is_active: false, note: null,
    termination_notice_date: null, planned_move_out_date: null,
    advance_rent_amount: 4800, deposit_amount: 9600, initial_electricity_meter: 200,
    rent_waived_year: null, rent_waived_month: null, line_user_id: null,
  },
];

const bill = (n, room, tenant, y, m, status, meterPrev, meterCur, extra = {}) => {
  const units = meterCur - meterPrev;
  const rent = room.monthly_rent;
  const water = 150;
  const electricity = units * 7;
  const other = extra.other ?? 0;
  return {
    id: uuid(300 + n), room_id: room.id, tenant_id: tenant.id,
    billing_year: y, billing_month: m, rent_amount: rent, occupant_count: 1,
    water_rate_per_person: 150, water_amount: water, previous_meter: meterPrev, current_meter: meterCur,
    electricity_units: units, electricity_rate: 7, electricity_amount: electricity, other_amount: other,
    total_amount: rent + water + electricity + other, status, due_date: day(y, m, 5),
    public_token: uuid(900 + n), created_at: `${day(y, m, 1)}T03:00:00Z`, updated_at: `${day(y, m, 1)}T03:00:00Z`,
    issued_at: `${day(y, m, 1)}T03:00:00Z`, paid_at: status === "paid" ? `${day(y, m, 6)}T05:00:00Z` : null,
    other_note: null, slip_path: status === "slip_submitted" ? "mock/slip.jpg" : null, slip_preview_path: null,
    slip_original_name: status === "slip_submitted" ? "slip.jpg" : null, slip_content_type: status === "slip_submitted" ? "image/jpeg" : null,
    slip_size_bytes: null, slip_submitted_at: status === "slip_submitted" ? `${day(y, m, 4)}T09:30:00Z` : null,
  };
};

const bills = [
  bill(1, rooms[0], tenants[0], prev.year, prev.month, "paid", 120, 168),
  bill(2, rooms[0], tenants[0], year, month, "slip_submitted", 168, 205, { other: 100 }),
  bill(3, rooms[1], tenants[1], prev.year, prev.month, "paid", 340, 402),
  bill(4, rooms[1], tenants[1], year, month, "unpaid", 402, 455),
  bill(5, rooms[2], tenants[2], prev.year, prev.month, "paid", 60, 98),
  bill(6, rooms[2], tenants[2], year, month, "unpaid", 98, 131),
  bill(7, rooms[3], tenants[3], prev.year, prev.month, "paid", 200, 238),
];

const billItems = [
  { id: uuid(401), bill_id: bills[1].id, item_name: "ค่ากุญแจ", amount: 100, created_at: bills[1].created_at },
];

const expenses = [
  { id: uuid(501), expense_date: day(year, month, 2), category: "water", amount: 620, billing_year: year, billing_month: month, note: "ค่าน้ำประปา", receipt_path: "mock/receipt.jpg", created_at: `${day(year, month, 2)}T04:00:00Z` },
  { id: uuid(502), expense_date: day(year, month, 3), category: "electricity", amount: 1840, billing_year: year, billing_month: month, note: null, created_at: `${day(year, month, 3)}T04:00:00Z` },
  { id: uuid(503), expense_date: day(year, month, 8), category: "cleaning", amount: 800, billing_year: year, billing_month: month, note: "แม่บ้าน", created_at: `${day(year, month, 8)}T04:00:00Z` },
];

const homepageSettings = [{
  id: "default",
  banner_badge: "ห้องพักในเมืองหาดใหญ่", banner_title: "อยู่สบาย เดินทางสะดวก", banner_highlight: "ที่ Home 39",
  banner_description: "ตรวจสอบสถานะห้องพัก ดูรายละเอียด และติดต่อสอบถามห้องว่างได้ในหน้าเดียว",
  banner_image_url: null, banner_image_position_x: 50, banner_image_position_y: 50, banner_image_zoom: 100,
  location_title: "เดินทางสะดวกในหาดใหญ่", location_description: "เปิดแผนที่เพื่อดูเส้นทางมายัง Home 39",
  map_url: "https://share.google/example", nearby_places: ["แบงค์ชาติ 250 ม.", "โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.) 400 ม.", "สยามนครินทร์ 700 ม."],
  contact_title: "สนใจจองห้องพัก?", contact_description: "ติดต่อสอบถามสถานะห้อง ราคา และรายละเอียดเพิ่มเติมได้ทุกช่องทาง",
  facebook_url: "https://www.facebook.com/example", line_id: "@example", line_url: "https://line.me/R/ti/p/%40example",
  phone_primary: "087-000-0000", phone_secondary: "089-000-0000",
  gallery_title: "", gallery_description: "", gallery_items: [], updated_at: "2026-01-01T00:00:00Z",
}];

const homepageRooms = rooms.map((room) => ({
  room_code: room.room_code, title: `ห้อง ${room.room_code}`, description: "ห้องพักสะดวกสบาย ในทำเลเดินทางง่ายใจกลางหาดใหญ่",
  monthly_price: room.monthly_rent, cover_image_url: null, cover_image_position_x: 50, cover_image_position_y: 50,
  cover_image_zoom: 100, image_urls: [], updated_at: "2026-01-01T00:00:00Z",
}));

const settlements = [{
  id: uuid(701), tenant_id: tenants[3].id, room_id: rooms[3].id, deposit_amount: 9600, final_electricity_meter: 262,
  electricity_amount: 168, water_amount: 150, items: [{ name: "ผนังมีรอย ทาสีใหม่", amount: 1500 }, { name: "ทำความสะอาด", amount: 500 }],
  items_amount: 2000, outstanding_bills_amount: 0, total_deductions: 2318, refund_amount: 7282,
  note: "ตรวจห้องวันย้ายออก ผนังด้านเตียงมีรอย", status: "open", refunded_on: null, refund_reference: null, refund_slip_path: null,
  closed_at: null, created_at: `${day(year, month, 2)}T08:00:00Z`, updated_at: `${day(year, month, 2)}T08:00:00Z`,
}];

const meterMonth = new Date().toISOString().slice(0, 7);
const meterUsage = [1, 2, 3, 5, 6, 8, 9, 12].map((d, i) => ({
  room_id: rooms[0].id, usage_date: `${meterMonth}-${String(d).padStart(2, "0")}`,
  kwh: [8.4, 9.1, 7.7, 12.3, 10, 9.6, 14.25, 11][i], end_total_kwh: null, source: i < 6 ? "manual" : "tuya", note: i === 0 ? "ตั้งแต่ต้นเดือน" : null,
}));

// tuyaCompare: a typed-in day that has Tuya totals on it and the day before, to show the comparison.
meterUsage.push(
  { room_id: rooms[0].id, usage_date: `${meterMonth}-13`, kwh: 5, end_total_kwh: 368.766, source: "manual", note: "จดจากจานหมุน" },
  { room_id: rooms[0].id, usage_date: `${meterMonth}-12`, kwh: 5.01, end_total_kwh: 363.568, source: "tuya", note: null },
);

export const tables = {
  meter_daily_usage: meterUsage,
  move_out_settlements: settlements,
  rooms, tenants, bills, bill_items: billItems, expenses,
  contracts: [{
    id: uuid(601), room_id: rooms[1].id, tenant_id: tenants[1].id, contract_start: day(year - 1, 8, 15), contract_end: null,
    deposit_amount: 10000, file_path: "mock/contract.pdf", original_file_name: "สัญญาเช่า ตัวอย่าง.pdf", note: null,
    created_at: `${day(year - 1, 8, 15)}T03:00:00Z`,
  }],
  payment_settings: [{ id: "default", bank_name: "ธนาคารตัวอย่าง", bank_code: "SCB", account_name: "ชื่อบัญชี ตัวอย่าง", account_number: "000-0-00000-0" }],
  homepage_settings: homepageSettings, homepage_rooms: homepageRooms,
  line_link_codes: [], line_notification_logs: [], bill_status_logs: [],
};

// Foreign-key hints for embedded selects: child table -> { relation: [kind, column] }
export const relations = {
  rooms: { tenants: ["many", "tenants", "room_id", "id"] },
  tenants: { rooms: ["one", "rooms", "id", "room_id"] },
  bills: {
    rooms: ["one", "rooms", "id", "room_id"],
    tenants: ["one", "tenants", "id", "tenant_id"],
    bill_items: ["many", "bill_items", "bill_id", "id"],
    line_notification_logs: ["many", "line_notification_logs", "bill_id", "id"],
  },
};

export const publicBill = (token) => {
  const found = bills.find((b) => b.public_token === token);
  if (!found) return null;
  const room = rooms.find((r) => r.id === found.room_id);
  return { ...found, room_code: room?.room_code, payment_settings: tables.payment_settings[0], bill_items: billItems.filter((i) => i.bill_id === found.id), tenant_name: "ตัวอย่าง ผู้เช่า" };
};

export const sampleBills = bills;
