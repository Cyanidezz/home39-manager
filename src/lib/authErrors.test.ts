import { describe, expect, it } from "vitest";
import { loginErrorMessage } from "./authErrors";

describe("loginErrorMessage", () => {
  it("hides which credential was wrong", () => {
    expect(loginErrorMessage("Invalid login credentials")).toBe("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    expect(loginErrorMessage("Email not confirmed")).toBe("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    expect(loginErrorMessage(undefined)).toBe("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  });

  it("explains rate limiting and network failures", () => {
    expect(loginErrorMessage("Email rate limit exceeded")).toContain("บ่อยเกินไป");
    expect(loginErrorMessage("Failed to fetch")).toContain("เชื่อมต่อ");
  });
});
