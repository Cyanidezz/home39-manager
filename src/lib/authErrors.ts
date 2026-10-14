/** Maps Supabase auth errors to Thai messages that do not reveal which field was wrong. */
export function loginErrorMessage(message: string | undefined) {
  const text = (message || "").toLowerCase();
  if (text.includes("rate limit") || text.includes("too many")) {
    return "ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }
  if (text.includes("fetch") || text.includes("network")) {
    return "เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่";
  }
  return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
}
