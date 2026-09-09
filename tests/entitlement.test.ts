import { describe, expect, it } from "vitest";
import {
  LIFETIME_PLAN,
  lifetimePriceVnd,
  TRIAL_DAYS,
  TRIAL_PER_DAY,
  TRIAL_TIMEZONE,
} from "@/lib/pricing";
import { daysSince, startOfDayIn } from "@/lib/day";
import { TrialExhaustedError } from "@/lib/errors";

const VN = "Asia/Ho_Chi_Minh";

describe("cấu hình dùng thử", () => {
  it("3 ngày, mỗi ngày 3 lượt", () => {
    expect(TRIAL_DAYS).toBe(3);
    expect(TRIAL_PER_DAY).toBe(3);
  });

  it("tính ngày theo giờ Việt Nam, không phải UTC", () => {
    expect(TRIAL_TIMEZONE).toBe(VN);
  });

  it("gói trọn đời $200", () => {
    expect(LIFETIME_PLAN.priceUsd).toBe(200);
    expect(lifetimePriceVnd()).toBeGreaterThan(4_000_000);
  });
});

describe("ranh giới một ngày", () => {
  it("nửa đêm giờ VN = 17:00 UTC hôm trước", () => {
    // 2026-09-09 03:00 giờ VN
    const now = new Date("2026-09-08T20:00:00Z");
    expect(startOfDayIn(VN, now).toISOString()).toBe("2026-09-08T17:00:00.000Z");
  });

  it("lấy nhầm UTC thì hạn mức reset lúc 7 giờ sáng — đây là chỗ dễ sai nhất", () => {
    const now = new Date("2026-09-09T02:00:00Z"); // 09:00 giờ VN
    const vn = startOfDayIn(VN, now);
    const utc = startOfDayIn("UTC", now);
    expect(vn.toISOString()).toBe("2026-09-08T17:00:00.000Z");
    expect(utc.toISOString()).toBe("2026-09-09T00:00:00.000Z");
    expect(vn.getTime()).not.toBe(utc.getTime());
  });

  it("cùng một ngày VN thì mốc nửa đêm giống nhau", () => {
    const sang = new Date("2026-09-08T18:00:00Z"); // 01:00 ngày 9 giờ VN
    const toi = new Date("2026-09-09T16:00:00Z"); // 23:00 ngày 9 giờ VN
    expect(startOfDayIn(VN, sang).getTime()).toBe(startOfDayIn(VN, toi).getTime());
  });
});

describe("đếm ngày dùng thử", () => {
  const dangKy = new Date("2026-09-06T10:00:00Z"); // 17:00 ngày 6 giờ VN

  it("ngày đăng ký là ngày 0", () => {
    expect(daysSince(dangKy, VN, new Date("2026-09-06T15:00:00Z"))).toBe(0);
  });

  it("qua nửa đêm VN là sang ngày 1, dù chưa đủ 24 tiếng", () => {
    // 18:00 UTC ngày 6 = 01:00 ngày 7 giờ VN — mới 8 tiếng nhưng đã là hôm sau.
    expect(daysSince(dangKy, VN, new Date("2026-09-06T18:00:00Z"))).toBe(1);
  });

  it("ngày thứ 3 vẫn còn hạn, ngày thứ 4 thì hết", () => {
    expect(daysSince(dangKy, VN, new Date("2026-09-08T15:00:00Z"))).toBe(2);
    expect(TRIAL_DAYS - 2).toBeGreaterThan(0);
    expect(daysSince(dangKy, VN, new Date("2026-09-09T15:00:00Z"))).toBe(3);
    expect(TRIAL_DAYS - 3).toBe(0);
  });
});

describe("thông báo hết lượt", () => {
  it("hết lượt hôm nay: nói mai có lại", () => {
    const e = new TrialExhaustedError(3, 3, false);
    expect(e.status).toBe(402);
    expect(e.message).toMatch(/[Mm]ai/);
  });

  it("hết hạn 3 ngày: KHÔNG hứa mai có lại", () => {
    const e = new TrialExhaustedError(0, 3, true);
    expect(e.message).toMatch(/hết hạn/);
    expect(e.message).not.toMatch(/[Mm]ai có/);
  });
});
