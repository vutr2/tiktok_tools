import { describe, expect, it } from "vitest";
import {
  activePacks,
  LIFETIME_PLAN,
  lifetimeBreakEven,
  lifetimePriceVnd,
} from "@/lib/pricing";

describe("gói trọn đời", () => {
  it("giá quy ra VND theo tỷ giá đang cấu hình", () => {
    expect(LIFETIME_PLAN.priceUsd).toBe(200);
    expect(lifetimePriceVnd()).toBeGreaterThan(4_000_000);
  });

  it("gói credit đã ngừng bán", () => {
    // Sản phẩm giờ là gói trọn đời. Bật lại thì test này nhắc phải xem lại
    // kinh tế đơn vị trước.
    expect(activePacks()).toHaveLength(0);
  });

  it("điểm hoà vốn tính được, không phải vô hạn", () => {
    // 8.880đ = trọn bộ 1 sản phẩm (4 ảnh + mô tả + kịch bản), đo từ giá vốn thật.
    const n = lifetimeBreakEven(8_880);
    expect(n).toBeGreaterThan(400);
    expect(n).toBeLessThan(800);
  });

  it("giá vốn 0 thì không chia cho 0", () => {
    expect(lifetimeBreakEven(0)).toBe(Infinity);
  });
});
