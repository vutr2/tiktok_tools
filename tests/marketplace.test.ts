import { describe, expect, it } from "vitest";
import {
  MARKETPLACE_RULES,
  fitTitle,
  normalizeHashtags,
  truncateAtWord,
  validateTitle,
} from "@/lib/marketplace";

describe("fitTitle", () => {
  it("giữ nguyên khi đủ chỗ", () => {
    const t = fitTitle(
      [
        { text: "Serum Niacinamide 10%", required: true },
        { text: "Cho Da Dầu Mụn" },
      ],
      120,
    );
    expect(t).toBe("Serum Niacinamide 10% | Cho Da Dầu Mụn");
  });

  it("bỏ segment optional từ cuối lên thay vì cắt chữ", () => {
    const t = fitTitle(
      [
        { text: "Serum Niacinamide 10%", required: true },
        { text: "Cho Da Dầu Mụn" },
        { text: "Chai 30ml Chính Hãng Nhập Khẩu Hàn Quốc" },
      ],
      45,
    );
    expect(t).toBe("Serum Niacinamide 10% | Cho Da Dầu Mụn");
    expect(t.length).toBeLessThanOrEqual(45);
  });

  it("không bao giờ vượt giới hạn dù toàn segment bắt buộc", () => {
    const long = "A".repeat(50) + " " + "B".repeat(50) + " " + "C".repeat(50);
    const t = fitTitle([{ text: long, required: true }], 120);
    expect(t.length).toBeLessThanOrEqual(120);
  });

  it("cắt tại ranh giới từ, không cắt giữa chữ", () => {
    const t = truncateAtWord("Serum Niacinamide Cho Da Dầu Mụn Nhạy Cảm", 25);
    expect(t.endsWith("D")).toBe(false);
    expect(t.split(" ").pop()).not.toBe("");
    expect(t.length).toBeLessThanOrEqual(25);
  });
});

describe("validateTitle", () => {
  it("báo lỗi khi vượt giới hạn Shopee", () => {
    const issues = validateTitle("x".repeat(121), "SHOPEE");
    expect(issues.some((i) => i.code === "TOO_LONG" && i.level === "error")).toBe(
      true,
    );
  });

  it("báo lỗi khi tiêu đề TikTok Shop quá ngắn", () => {
    const issues = validateTitle("Serum 30ml", "TIKTOK_SHOP");
    expect(issues.some((i) => i.code === "TOO_SHORT")).toBe(true);
  });

  it("cảnh báo viết hoa cả cụm và nhồi từ khoá", () => {
    const shouting = validateTitle("SERUM NIACINAMIDE CHO DA DAU MUN", "SHOPEE");
    expect(shouting.some((i) => i.code === "SHOUTING")).toBe(true);

    const stuffed = validateTitle(
      "Serum serum serum niacinamide cho da dầu",
      "SHOPEE",
    );
    expect(stuffed.some((i) => i.code === "KEYWORD_STUFFING")).toBe(true);
  });

  it("tiêu đề hợp lệ thì không có lỗi mức error", () => {
    const title =
      "Serum Niacinamide 10% Zinc PCA Cho Da Dầu Mụn Chai 30ml Thấm Nhanh";
    expect(title.length).toBeLessThanOrEqual(MARKETPLACE_RULES.SHOPEE.titleMax);
    expect(validateTitle(title, "SHOPEE").filter((i) => i.level === "error")).toEqual(
      [],
    );
  });
});

describe("normalizeHashtags", () => {
  it("bỏ dấu, viết liền, chữ thường, khử trùng lặp và cắt theo max", () => {
    const tags = normalizeHashtags(
      ["#Mỹ Phẩm", "mỹ phẩm", "Da Dầu", "#serum", "đồ skincare"],
      3,
    );
    expect(tags).toEqual(["#mypham", "#dadau", "#serum"]);
  });
});
