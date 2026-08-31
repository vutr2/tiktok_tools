import { beforeEach, describe, expect, it } from "vitest";
import {
  CREDIT_COST,
  TARGET_MARGIN,
  claudeCostVnd,
  marginRow,
  measuredImageCostVnd,
  revenuePerCreditVnd,
  verdict,
} from "@/lib/pricing";

beforeEach(() => {
  process.env.USD_VND = "26300";
});

describe("tỷ lệ credit đã chốt", () => {
  it("1 credit = 1 lần sinh text, 5 credit = 1 ảnh", () => {
    expect(CREDIT_COST.LISTING_COPY).toBe(1);
    expect(CREDIT_COST.VIDEO_SCRIPT).toBe(1);
    expect(CREDIT_COST.PRODUCT_PHOTO_PER_SCENE).toBe(5);
  });

  it("99k / 60 credit = 1.650đ mỗi credit", () => {
    expect(revenuePerCreditVnd()).toBe(1650);
  });
});

describe("marginRow", () => {
  it("không bịa biên khi chưa có giá vốn", () => {
    const row = marginRow({
      kind: "PRODUCT_PHOTO",
      label: "Ảnh",
      credits: 5,
      costVnd: null,
    });
    expect(row.marginPct).toBeNull();
    expect(row.suggestedCredits).toBeNull();
  });

  it("tính đúng biên và đề xuất số credit đạt mục tiêu", () => {
    const row = marginRow({
      kind: "PRODUCT_PHOTO",
      label: "Ảnh",
      credits: 5,
      costVnd: 4125, // 50% của 8.250đ doanh thu
    });
    expect(row.revenueVnd).toBe(8250);
    expect(row.marginPct).toBeCloseTo(0.5, 5);
    // cần cost/revenue <= 40% -> revenue >= 10312.5 -> 7 credit
    expect(row.suggestedCredits).toBe(7);
  });
});

describe("verdict", () => {
  it("bắt được trường hợp lỗ", () => {
    const rows = [
      marginRow({ kind: "VIDEO_SCRIPT", label: "Kịch bản", credits: 1, costVnd: 2500 }),
    ];
    const v = verdict(rows);
    expect(v.ok).toBe(false);
    expect(v.negative).toHaveLength(1);
  });

  it("bắt được biên mỏng", () => {
    const rows = [
      marginRow({ kind: "LISTING_COPY", label: "Mô tả", credits: 1, costVnd: 900 }),
    ];
    const v = verdict(rows);
    expect(v.thin).toHaveLength(1);
    expect(v.thin[0].marginPct!).toBeLessThan(TARGET_MARGIN);
  });

  it("chưa đo giá ảnh thì không kết luận ok", () => {
    const rows = [
      marginRow({ kind: "PRODUCT_PHOTO", label: "Ảnh", credits: 5, costVnd: null }),
    ];
    expect(verdict(rows).ok).toBe(false);
  });
});

describe("giá vốn ảnh", () => {
  it("trống nghĩa là CHƯA ĐO, không có giá trị mặc định", () => {
    delete process.env.IMAGE_COST_VND_PER_SCENE;
    expect(measuredImageCostVnd()).toBeNull();
    process.env.IMAGE_COST_VND_PER_SCENE = "";
    expect(measuredImageCostVnd()).toBeNull();
  });
});

describe("claudeCostVnd", () => {
  it("tính theo bảng giá token", () => {
    // 1M input @ $5 = $5 = 131.500đ
    expect(claudeCostVnd("claude-opus-5", 1_000_000, 0)).toBeCloseTo(131_500, 0);
    expect(claudeCostVnd("claude-opus-5", 0, 1_000_000)).toBeCloseTo(657_500, 0);
  });
});
