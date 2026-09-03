import { describe, expect, it } from "vitest";
import { auditScript } from "@/lib/ai/text-core";
import { getPack } from "@/prompts";

const pack = getPack("GIA_DUNG");

function scene(seconds: number, words: number) {
  return {
    seconds,
    voiceover: Array(words).fill("chữ").join(" "),
    shot: "Cận tay thao tác",
    onScreenText: "",
  };
}

describe("auditScript", () => {
  it("cộng đúng tổng thời lượng", () => {
    const out = auditScript(
      {
        angle: "So kèo giá",
        objectionHandled: "Rẻ thế chắc mau hỏng",
        hook: scene(3, 7),
        scenes: [scene(9, 20), scene(9, 20), scene(9, 20)],
        cta: "Bấm giỏ hàng góc trái",
      },
      pack,
    );
    expect(out.totalSeconds).toBe(30);
    expect(out.warnings).toEqual([]);
  });

  it("cảnh báo khi tổng lệch khỏi 30 giây", () => {
    const out = auditScript(
      {
        angle: "x",
        objectionHandled: "y",
        hook: scene(3, 7),
        scenes: [scene(10, 22)],
        cta: "z",
      },
      pack,
    );
    expect(out.totalSeconds).toBe(13);
    expect(out.warnings.some((w) => w.includes("30s"))).toBe(true);
  });

  it("cảnh báo khi hook không phải 3 giây", () => {
    const out = auditScript(
      {
        angle: "x",
        objectionHandled: "y",
        hook: scene(6, 12),
        scenes: [scene(12, 28), scene(12, 28)],
        cta: "z",
      },
      pack,
    );
    expect(out.warnings.some((w) => w.includes("Hook"))).toBe(true);
  });

  it("cảnh báo khi lời thoại dài hơn thời lượng cho phép", () => {
    const out = auditScript(
      {
        angle: "x",
        objectionHandled: "y",
        hook: scene(3, 30),
        scenes: [scene(27, 60)],
        cta: "z",
      },
      pack,
    );
    expect(out.warnings.some((w) => w.includes("đọc không kịp"))).toBe(true);
  });

  it("bắt cụm rủi ro trong lời thoại", () => {
    const out = auditScript(
      {
        angle: "x",
        objectionHandled: "y",
        hook: {
          seconds: 3,
          voiceover: "Bảo hành trọn đời luôn nhé",
          shot: "Cận sản phẩm",
          onScreenText: "",
        },
        scenes: [scene(27, 60)],
        cta: "z",
      },
      pack,
    );
    expect(out.warnings.some((w) => w.includes("Cụm rủi ro"))).toBe(true);
  });
});
