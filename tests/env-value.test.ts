import { describe, expect, it } from "vitest";
import { assertSupabaseUrl, cleanEnv } from "@/lib/env-value";

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
