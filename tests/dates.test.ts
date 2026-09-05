import { describe, expect, it } from "vitest";
import { pgDate, pgDateRequired } from "@/lib/dates";

describe("đọc timestamp từ Postgres", () => {
  it("chuỗi KHÔNG có múi giờ phải hiểu là UTC, không phải giờ máy", () => {
    // Đây là lỗi đã làm mọi phiên đăng nhập bị coi là hết hạn ngay khi tạo:
    // ở UTC+7, new Date("...T16:59:41") lệch 7 tiếng so với giá trị đã lưu.
    const naive = "2026-09-04T16:59:41.571";
    expect(pgDateRequired(naive).toISOString()).toBe("2026-09-04T16:59:41.571Z");
    expect(pgDateRequired(naive).getTime()).toBe(Date.parse(naive + "Z"));
  });

  it("chuỗi có Z thì giữ nguyên, không gắn thêm", () => {
    const s = "2026-09-04T16:59:41.571Z";
    expect(pgDateRequired(s).toISOString()).toBe(s);
  });

  it("chuỗi có offset ±hh:mm cũng giữ nguyên", () => {
    expect(pgDateRequired("2026-09-04T23:59:41+07:00").toISOString()).toBe(
      "2026-09-04T16:59:41.000Z",
    );
  });

  it("null trả null, không ném", () => {
    expect(pgDate(null)).toBeNull();
    expect(pgDate(undefined)).toBeNull();
  });

  it("Date truyền vào thì trả lại nguyên vẹn", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    expect(pgDate(d)).toBe(d);
  });

  it("phiên vừa tạo KHÔNG được coi là hết hạn", () => {
    const expires = new Date(Date.now() + 1800_000)
      .toISOString()
      .replace("Z", ""); // đúng cách Postgres trả về
    expect(pgDateRequired(expires) > new Date()).toBe(true);
  });
});
