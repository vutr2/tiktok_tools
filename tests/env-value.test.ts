import { describe, expect, it } from "vitest";
import { assertSupabaseUrl, cleanEnv, envNumberOr } from "@/lib/env-value";

describe("bỏ dấu nháy quanh giá trị", () => {
  it("nháy đơn — đúng lỗi đã gặp trên Vercel", () => {
    expect(cleanEnv("'https://abc.supabase.co'")).toBe("https://abc.supabase.co");
  });

  it("nháy kép", () => {
    expect(cleanEnv('"https://abc.supabase.co"')).toBe("https://abc.supabase.co");
  });

  it("không nháy thì giữ nguyên", () => {
    expect(cleanEnv("https://abc.supabase.co")).toBe("https://abc.supabase.co");
  });

  it("nháy lệch hai đầu KHÔNG bị cắt bừa", () => {
    expect(cleanEnv("'https://abc.supabase.co\"")).toBe("'https://abc.supabase.co\"");
  });

  it("khoảng trắng thừa bị cắt", () => {
    expect(cleanEnv("  https://abc.supabase.co  ")).toBe("https://abc.supabase.co");
  });

  it("rỗng hoặc chỉ có nháy trả undefined", () => {
    expect(cleanEnv("")).toBeUndefined();
    expect(cleanEnv("   ")).toBeUndefined();
    expect(cleanEnv("''")).toBeUndefined();
    expect(cleanEnv(undefined)).toBeUndefined();
  });
});

describe("kiểm URL Supabase", () => {
  it("URL đúng thì qua", () => {
    expect(() => assertSupabaseUrl("https://abc.supabase.co")).not.toThrow();
  });

  it("thiếu giao thức thì chặn, và chỉ rõ cách sửa", () => {
    const run = () => assertSupabaseUrl("abc.supabase.co");
    expect(run).toThrow(/dấu nháy/);
    // Thông báo phải cảnh báo về tiền tố NEXT_PUBLIC_: biến có tiền tố bị nướng
    // cứng lúc build, đặt lại trên hosting cũng vô ích tới khi deploy lại.
    expect(run).toThrow(/NEXT_PUBLIC_/);
    expect(run).toThrow(/SUPABASE_URL/);
  });

  it("giao thức lạ thì chặn", () => {
    expect(() => assertSupabaseUrl("ftp://abc.supabase.co")).toThrow();
  });

  it("còn dấu nháy thì chặn — thông báo hiện nguyên giá trị để dễ thấy", () => {
    expect(() => assertSupabaseUrl("'https://abc.supabase.co'")).toThrow(
      /'https:\/\/abc\.supabase\.co'/,
    );
  });
});

describe("envNumberOr — biến số rỗng không được thành 0", () => {
  it("không đặt thì dùng mặc định", () => {
    expect(envNumberOr(undefined, 26_300)).toBe(26_300);
  });

  it("RỖNG cũng dùng mặc định — đây là lỗi đã làm gói $200 hiện '≈ 0đ'", () => {
    // `Number(process.env.X ?? 26300)` cho ra 0 ở đây: `??` không nhảy vì biến
    // có mặt, và Number("") = 0.
    // Cách viết cũ, để đối chứng. Phải đi qua biến: viết thẳng `"" ?? 26300`
    // thì TypeScript biết vế trái không bao giờ nullish và chặn ngay.
    const raw: string | undefined = "";
    expect(Number(raw ?? 26_300)).toBe(0);
    expect(envNumberOr("", 26_300)).toBe(26_300);
  });

  it("chỉ có khoảng trắng cũng vậy", () => {
    expect(envNumberOr("   ", 26_300)).toBe(26_300);
  });

  it("còn nguyên dấu nháy vẫn đọc được — bẫy ô Environment Variables của Vercel", () => {
    expect(Number('"26300"')).toBeNaN(); // cách viết cũ
    expect(envNumberOr('"26300"', 1)).toBe(26_300);
    expect(envNumberOr("'26300'", 1)).toBe(26_300);
  });

  it("không phải số thì dùng mặc định thay vì trả NaN", () => {
    expect(envNumberOr("hai mươi sáu nghìn", 26_300)).toBe(26_300);
    expect(envNumberOr("NaN", 26_300)).toBe(26_300);
  });

  it("Infinity không phải giá trị dùng được", () => {
    expect(envNumberOr("Infinity", 26_300)).toBe(26_300);
  });

  it("giá trị hợp lệ thì tôn trọng, kể cả số thập phân", () => {
    expect(envNumberOr("25000", 26_300)).toBe(25_000);
    expect(envNumberOr(" 25000.5 ", 26_300)).toBe(25_000.5);
  });

  it("min chặn giá trị vô nghĩa nhưng vẫn cho phép 0 khi 0 là cố ý", () => {
    // Tỉ giá: dưới 1 là vô nghĩa.
    expect(envNumberOr("0", 26_300, { min: 1 })).toBe(26_300);
    expect(envNumberOr("-5", 26_300, { min: 1 })).toBe(26_300);
    // Số ngày dùng thử: đặt 0 là cố ý tắt dùng thử, phải giữ nguyên.
    expect(envNumberOr("0", 3, { min: 0 })).toBe(0);
  });
});

describe("giá gói không bao giờ được ra 0", () => {
  const rate = (raw: string | undefined) => envNumberOr(raw, 26_300, { min: 1 });

  it("mọi kiểu cấu hình hỏng đều vẫn ra giá dương", () => {
    for (const bad of [undefined, "", "  ", '"26300"', "abc", "0", "-1"]) {
      expect(200 * rate(bad)).toBeGreaterThan(0);
    }
  });
});
