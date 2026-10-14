export function getBillStatus(status: string) {
  switch (status) {
    case "paid":
      return { text: "ชำระแล้ว", className: "bg-green-100 text-green-700" };
    case "unpaid":
      return { text: "ยังไม่ชำระ", className: "bg-red-100 text-red-700" };
    case "overdue":
      return { text: "เกินกำหนด", className: "bg-orange-100 text-orange-700" };
    case "slip_submitted":
      return { text: "ส่งสลิปแล้ว", className: "bg-brand-100 text-brand-700" };
    case "verifying":
      return { text: "กำลังตรวจสอบ", className: "bg-yellow-100 text-yellow-700" };
    case "rejected":
      return { text: "สลิปไม่ผ่าน", className: "bg-red-100 text-red-700" };
    case "draft":
      return { text: "ฉบับร่าง", className: "bg-sand-100 text-sand-700" };
    default:
      return { text: status, className: "bg-sand-100 text-sand-700" };
  }
}
