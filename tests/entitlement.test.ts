import { describe, expect, it } from "vitest";
import { FREE_TRIAL_GENERATIONS, LIFETIME_PLAN, lifetimePriceVnd } from "@/lib/pricing";
import { TrialExhaustedError } from "@/lib/errors";

describe("dùng thử rồi mua trọn đời", () => {
  it("hạn mức thử = đúng một sản phẩm trọn bộ (4 ảnh + mô tả + kịch bản)", () => {
    expect(FREE_TRIAL_GENERATIONS).toBe(6);
  });

  it("gói trọn đời $200", () => {
    expect(LIFETIME_PLAN.priceUsd).toBe(200);
    expect(lifetimePriceVnd()).toBeGreaterThan(4_000_000);
  });

  it("hết lượt trả 402, không phải 500 — đây là lúc mời mua, không phải lỗi", () => {
    const e = new TrialExhaustedError(6, 6);
    expect(e.status).toBe(402);
    expect(e.code).toBe("TRIAL_EXHAUSTED");
    expect(e.message).toMatch(/trọn đời/);
  });
});
