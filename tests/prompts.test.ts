import { describe, expect, it } from "vitest";
import { INDUSTRIES } from "@/lib/industries";
import {
  allScenes,
  buildListingSystem,
  buildPhotoPrompt,
  buildScriptSystem,
  getPack,
  lintClaims,
} from "@/prompts";

describe("bộ prompt theo ngành", () => {
  it("mỗi ngành có đúng 4 bối cảnh, id không trùng", () => {
    for (const industry of INDUSTRIES) {
      const scenes = allScenes(industry);
      expect(scenes, industry).toHaveLength(4);
      expect(new Set(scenes.map((s) => s.id)).size, industry).toBe(4);
      for (const s of scenes) {
        expect(s.prompt.length, `${industry}/${s.id}`).toBeGreaterThan(80);
        expect(s.negative.length, `${industry}/${s.id}`).toBeGreaterThan(10);
      }
    }
  });

  it("mỗi ngành có nội dung riêng, không dùng chung prompt", () => {
    const voices = INDUSTRIES.map((i) => getPack(i).voice);
    expect(new Set(voices).size).toBe(INDUSTRIES.length);

    const hooks = INDUSTRIES.flatMap((i) => getPack(i).hookPatterns);
    expect(new Set(hooks).size).toBe(hooks.length);
  });

  it("ngành nào cũng có cụm cấm và ràng buộc riêng", () => {
    for (const industry of INDUSTRIES) {
      const pack = getPack(industry);
      expect(pack.bannedClaims.length, industry).toBeGreaterThan(0);
      expect(pack.compliance.length, industry).toBeGreaterThan(0);
      expect(pack.objections.length, industry).toBeGreaterThan(0);
      for (const claim of pack.bannedClaims) {
        expect(() => new RegExp(claim.pattern, "i")).not.toThrow();
      }
    }
  });

  it("prompt hệ thống nhắc đúng giới hạn ký tự của hai sàn", () => {
    const sys = buildListingSystem("MY_PHAM");
    expect(sys).toContain("120");
    expect(sys).toContain("255");
  });

  it("prompt ảnh cấm model vẽ lại sản phẩm", () => {
    const spec = buildPhotoPrompt({
      industry: "THOI_TRANG",
      sceneId: "seamless_studio",
      productName: "áo sơ mi linen",
    });
    expect(spec.prompt).toContain("do not redraw");
    expect(spec.prompt).toContain("áo sơ mi linen");
  });

  it("prompt kịch bản ép hook 3 giây và tổng 30 giây", () => {
    const sys = buildScriptSystem("PHU_KIEN");
    expect(sys).toContain("30 giây");
    expect(sys).toContain("3 giây");
  });
});

describe("lintClaims", () => {
  it("bắt claim y tế của mỹ phẩm", () => {
    const hits = lintClaims(
      "Serum trị mụn cấp tốc, an toàn tuyệt đối cho mọi loại da",
      getPack("MY_PHAM"),
    );
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it("bắt tên thương hiệu khác trong ngành thời trang", () => {
    const hits = lintClaims("Áo phông form rộng kiểu Zara", getPack("THOI_TRANG"));
    expect(hits).toHaveLength(1);
    expect(hits[0].matched.toLowerCase()).toContain("zara");
  });

  it("bắt claim sữa cho trẻ dưới 24 tháng", () => {
    const hits = lintClaims(
      "Sản phẩm tốt hơn sữa mẹ cho bé phát triển toàn diện",
      getPack("ME_VA_BE"),
    );
    expect(hits.length).toBeGreaterThan(0);
  });

  it("khớp được cụm kết thúc bằng nguyên âm có dấu (\\b của JS không làm được)", () => {
    // Hồi quy: "\\b" chỉ hiểu ASCII nên "tác dụng phụ" (kết thúc bằng "ụ") từng
    // lọt lưới hoàn toàn. Ranh giới từ phải dùng lookaround Unicode.
    expect(
      lintClaims("Kem này không tác dụng phụ", getPack("MY_PHAM")),
    ).toHaveLength(1);
    expect(
      lintClaims("Bảo hành trọn đời cho khách", getPack("GIA_DUNG")),
    ).toHaveLength(1);
  });

  it("nội dung sạch thì không báo gì", () => {
    const hits = lintClaims(
      "Serum niacinamide 10%, hỗ trợ giảm dầu, đã test kích ứng",
      getPack("MY_PHAM"),
    );
    expect(hits).toEqual([]);
  });
});
