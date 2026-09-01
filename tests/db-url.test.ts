import { describe, expect, it } from "vitest";
import { checkDatabaseUrl } from "@/lib/db-url";

const ok = (url: string) =>
  checkDatabaseUrl(url, { envFileExists: true });

const POOLED =
  "postgresql://postgres.abcdefgh:s3cret@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
const DIRECT =
  "postgresql://postgres.abcdefgh:s3cret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

describe("chuỗi hợp lệ thì không chặn", () => {
  it("pooler đúng chuẩn", () => expect(() => ok(POOLED)).not.toThrow());
  it("session pooler 5432", () => expect(() => ok(DIRECT)).not.toThrow());
  it("postgres local", () =>
    expect(() =>
      ok("postgresql://postgres:postgres@localhost:5432/tiktok_tools?schema=public"),
    ).not.toThrow());
  it("host IPv6 trong ngoặc vuông", () =>
    expect(() =>
      ok("postgresql://postgres:pw@[2406:da1a:314:7101::1]:5432/postgres"),
    ).not.toThrow());
  it("mật khẩu có chữ 'password' không bị nhầm là chỗ trống", () =>
    expect(() => ok(DIRECT.replace("s3cret", "mypassword123"))).not.toThrow());
  it("dấu @ đã encode thành %40", () =>
    expect(() => ok(DIRECT.replace("s3cret", "pw%40200512"))).not.toThrow());
});

describe("chưa cấu hình", () => {
  it("không có .env thì bảo tạo .env", () => {
    expect(() =>
      checkDatabaseUrl(undefined, { envFileExists: false }),
    ).toThrow(/Chưa có file .env/);
  });

  it("có .env nhưng thiếu biến thì chỉ vào Dashboard", () => {
    expect(() =>
      checkDatabaseUrl(undefined, { envFileExists: true }),
    ).toThrow(/Thiếu DATABASE_URL/);
  });

  it("còn mẫu <password>", () =>
    expect(() => ok(DIRECT.replace("s3cret", "<password>"))).toThrow(/<password>/));

  it("còn mẫu [YOUR-PASSWORD] của Supabase", () =>
    expect(() => ok(DIRECT.replace("s3cret", "[YOUR-PASSWORD]"))).toThrow(
      /YOUR-PASSWORD/,
    ));
});

describe("mật khẩu chưa URL-encode", () => {
  it("dấu @ thô bị bắt, và nói rõ phải đổi thành %40", () => {
    expect(() => ok(DIRECT.replace("s3cret", "pw@200512050307"))).toThrow(/%40/);
  });

  it("bắt cả trên chuỗi pooler", () => {
    expect(() => ok(POOLED.replace("s3cret", "pw@200512050307"))).toThrow(/%40/);
  });
});

describe("pooler thiếu pgbouncer", () => {
  it("cổng 6543 mà không có pgbouncer=true thì chặn", () => {
    expect(() => ok(POOLED.replace("?pgbouncer=true&connection_limit=1", ""))).toThrow(
      /pgbouncer=true/,
    );
  });

  it("cổng 5432 thì không cần", () =>
    expect(() => ok(DIRECT)).not.toThrow());
});
