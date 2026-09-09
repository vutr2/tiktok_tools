import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { baseUrl, sepayEnabled } from "@/lib/sepay";
import { cleanEnv } from "@/lib/env-value";

/**
 * Bẫy dấu nháy của ô Environment Variables trên Vercel.
 *
 * File .env cho phép `KEY="abc"` và dotenv tự bóc nháy. Ô trên Vercel thì
 * không — dán nguyên dòng từ .env vào đó là giá trị mang luôn hai dấu nháy.
 * Với secret key thì hậu quả câm lặng: HMAC ký bằng `"abc"` khác ký bằng `abc`,
 * cổng từ chối chữ ký, máy cá nhân vẫn chạy ngon.
 */

const KEYS = [
  "SEPAY_MERCHANT_ID",
  "SEPAY_SECRET_KEY",
  "SEPAY_ENV",
  "NEXT_PUBLIC_BASE_URL",
  "VERCEL_URL",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("sepayEnabled", () => {
  it("thiếu biến thì tắt", () => {
    expect(sepayEnabled()).toBe(false);
  });

  it("có đủ thì bật", () => {
    process.env.SEPAY_MERCHANT_ID = "SP-TEST-1";
    process.env.SEPAY_SECRET_KEY = "abc";
    expect(sepayEnabled()).toBe(true);
  });

  it("còn nguyên dấu nháy vẫn nhận ra là có cấu hình", () => {
    process.env.SEPAY_MERCHANT_ID = '"SP-TEST-1"';
    process.env.SEPAY_SECRET_KEY = '"abc"';
    expect(sepayEnabled()).toBe(true);
  });

  it("chuỗi rỗng hoặc chỉ có nháy rỗng thì coi như chưa cấu hình", () => {
    process.env.SEPAY_MERCHANT_ID = "";
    process.env.SEPAY_SECRET_KEY = '""';
    expect(sepayEnabled()).toBe(false);
  });
});

describe("bóc dấu nháy khỏi thông tin xác thực", () => {
  it("dấu nháy làm secret khác đi — đây là gốc của lỗi chữ ký", () => {
    // Không bóc thì đây là hai secret khác nhau, và HMAC ra hai kết quả khác
    // nhau. Cổng chỉ báo "chữ ký sai", không nói vì sao.
    expect('"abc"').not.toBe("abc");
    expect(cleanEnv('"abc"')).toBe("abc");
    expect(cleanEnv("'abc'")).toBe("abc");
    expect(cleanEnv("  abc  ")).toBe("abc");
  });

  it("nháy lệch đầu đuôi thì giữ nguyên, không đoán bừa", () => {
    expect(cleanEnv('"abc')).toBe('"abc');
    expect(cleanEnv("abc\"")).toBe('abc"');
  });
});

describe("baseUrl", () => {
  it("ưu tiên biến đã đặt và bỏ dấu / thừa ở cuối", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://vi-du.vercel.app///";
    expect(baseUrl()).toBe("https://vi-du.vercel.app");
  });

  it("bóc dấu nháy — URL còn nháy là URL quay về sai, cổng từ chối", () => {
    process.env.NEXT_PUBLIC_BASE_URL = '"https://vi-du.vercel.app"';
    expect(baseUrl()).toBe("https://vi-du.vercel.app");
  });

  it("để rỗng thì rơi về VERCEL_URL chứ không phải localhost", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "";
    process.env.VERCEL_URL = "abc.vercel.app";
    expect(baseUrl()).toBe("https://abc.vercel.app");
  });

  it("không có gì thì mới là localhost", () => {
    expect(baseUrl()).toBe("http://localhost:3000");
  });
});
