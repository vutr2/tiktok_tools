import { describe, expect, it } from "vitest";
import { toGeminiAspect } from "@/lib/ai/image";
import { INDUSTRIES } from "@/lib/industries";
import { allScenes } from "@/prompts";

describe("tỷ lệ khung hình gửi cho Gemini", () => {
  const SUPPORTED = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];

  it("quy 4:5 về 3:4 — Gemini không nhận 4:5", () => {
    expect(toGeminiAspect("4:5")).toBe("3:4");
  });

  it("giữ nguyên tỷ lệ được hỗ trợ", () => {
    expect(toGeminiAspect("1:1")).toBe("1:1");
    expect(toGeminiAspect("9:16")).toBe("9:16");
  });

  it("tỷ lệ lạ rơi về 1:1 thay vì để API lỗi", () => {
    expect(toGeminiAspect("7:3")).toBe("1:1");
  });

  it("mọi bối cảnh của mọi ngành đều ra tỷ lệ Gemini nhận được", () => {
    for (const industry of INDUSTRIES) {
      for (const scene of allScenes(industry)) {
        expect(SUPPORTED, `${industry}/${scene.id}`).toContain(
          toGeminiAspect(scene.aspect),
        );
      }
    }
  });
});
