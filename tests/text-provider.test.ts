import { afterEach, describe, expect, it } from "vitest";
import { DEEPSEEK_MODELS, deepseekCostVnd } from "@/lib/pricing";
import { textProvider } from "@/lib/ai/text";
import { ProviderError } from "@/lib/errors";

const original = process.env.TEXT_PROVIDER;
afterEach(() => {
  if (original === undefined) delete process.env.TEXT_PROVIDER;
  else process.env.TEXT_PROVIDER = original;
});

describe("chọn provider text", () => {
  it("mặc định là claude khi chưa đặt biến", () => {
    delete process.env.TEXT_PROVIDER;
    expect(textProvider().name).toBe("claude");
  });

  it("đọc được deepseek", () => {
    process.env.TEXT_PROVIDER = "deepseek";
    expect(textProvider().name).toBe("deepseek");
  });

  it("không phân biệt hoa thường", () => {
    process.env.TEXT_PROVIDER = "DeepSeek";
    expect(textProvider().name).toBe("deepseek");
  });

  it("tên lạ thì chặn ngay, không im lặng rơi về claude", () => {
    process.env.TEXT_PROVIDER = "khong-ton-tai";
    expect(() => textProvider()).toThrow(ProviderError);
  });

  it("cả hai provider đều có đủ hai hàm", () => {
    for (const name of ["claude", "deepseek"]) {
      process.env.TEXT_PROVIDER = name;
      const p = textProvider();
      expect(typeof p.generateListingCopy, name).toBe("function");
      expect(typeof p.generateVideoScripts, name).toBe("function");
    }
  });
});

describe("giá DeepSeek", () => {
  // 3.000 token vào / 3.200 ra — đúng giả định của scripts/unit-economics.ts.
  const RUN = { inputMiss: 3_000, inputHit: 0, output: 3_200 };

  it("V4-Flash rẻ hơn V4-Pro trên cùng workload", () => {
    const flash = deepseekCostVnd("deepseek-v4-flash", RUN);
    const pro = deepseekCostVnd("deepseek-v4-pro", RUN);
    expect(flash).not.toBeNull();
    expect(pro).not.toBeNull();
    expect(flash!).toBeLessThan(pro!);
  });

  it("token trúng cache rẻ hơn hẳn token miss", () => {
    const miss = deepseekCostVnd("deepseek-v4-flash", {
      inputMiss: 100_000,
      inputHit: 0,
      output: 0,
    })!;
    const hit = deepseekCostVnd("deepseek-v4-flash", {
      inputMiss: 0,
      inputHit: 100_000,
      output: 0,
    })!;
    expect(hit).toBeLessThan(miss / 10);
  });

  it("model chưa có giá niêm yết trả null, KHÔNG bịa số", () => {
    expect(DEEPSEEK_MODELS["deepseek-v4-flash-vision-exp"]).toBeNull();
    expect(deepseekCostVnd("deepseek-v4-flash-vision-exp", RUN)).toBeNull();
  });

  it("model không có trong bảng cũng trả null", () => {
    expect(deepseekCostVnd("model-la-hoac", RUN)).toBeNull();
  });

  it("một lần sinh kịch bản bằng V4-Flash rẻ hơn 1 credit doanh thu (1.650đ)", () => {
    expect(deepseekCostVnd("deepseek-v4-flash", RUN)!).toBeLessThan(1_650);
  });
});
