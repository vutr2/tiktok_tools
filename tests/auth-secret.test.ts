import { describe, expect, it } from "vitest";
import { AUTH_SECRET_MIN, checkAuthSecret } from "@/lib/auth";
import { AppError } from "@/lib/errors";

describe("AUTH_SECRET", () => {
  const good = "x".repeat(AUTH_SECRET_MIN);

  it("đủ dài thì qua", () => {
    expect(() => checkAuthSecret(good)).not.toThrow();
  });

  it("chưa đặt: báo AppError, KHÔNG phải Error trần", () => {
    // Error trần lọt ra ngoài thành 500 kèm stack — người vận hành không biết
    // sửa ở đâu. Đây chính là lỗi đã gặp trên Vercel.
    try {
      checkAuthSecret(undefined);
      throw new Error("đáng lẽ phải ném");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).code).toBe("AUTH_SECRET_MISSING");
    }
  });

  it("chưa đặt: chỉ cả đường máy cá nhân lẫn đường hosting", () => {
    const run = () => checkAuthSecret(undefined);
    expect(run).toThrow(/\.env/);
    expect(run).toThrow(/Environment Variables/);
    expect(run).toThrow(/DEPLOY LẠI/);
  });

  it("quá ngắn là mã lỗi KHÁC — cách sửa khác nhau", () => {
    try {
      checkAuthSecret("ngan-qua");
      throw new Error("đáng lẽ phải ném");
    } catch (e) {
      expect((e as AppError).code).toBe("AUTH_SECRET_TOO_SHORT");
      expect((e as AppError).message).toMatch(/8 ký tự/);
    }
  });

  it("thiếu đúng 1 ký tự vẫn bị chặn", () => {
    expect(() => checkAuthSecret("x".repeat(AUTH_SECRET_MIN - 1))).toThrow(AppError);
  });
});
