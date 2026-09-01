/**
 * Soát chuỗi kết nối trước khi Prisma chạm vào nó.
 *
 * Tách khỏi db.ts để test được: mấy lỗi dưới đây đều im lặng hoặc báo sai chỗ,
 * và mỗi cái đã đốt của ai đó nửa buổi.
 */

const PLACEHOLDER = /<[^>]+>|\[[^\]:]*password[^\]:]*\]/i;

export class DatabaseUrlError extends Error {}

export function checkDatabaseUrl(
  url: string | undefined,
  opts: { envFileExists: boolean },
): void {
  if (!url) {
    throw new DatabaseUrlError(
      opts.envFileExists
        ? "Thiếu DATABASE_URL trong .env. Lấy chuỗi kết nối ở Supabase Dashboard > " +
          "Connect > ORMs > Prisma (cần cả DIRECT_URL). Xem docs/supabase.md."
        : "Chưa có file .env. Chạy `cp .env.example .env`, rồi dán 2 chuỗi kết nối " +
          "Supabase (DATABASE_URL + DIRECT_URL) và đặt AUTH_SECRET. Xem docs/supabase.md.",
    );
  }

  const placeholder = url.match(PLACEHOLDER);
  if (placeholder) {
    throw new DatabaseUrlError(
      `DATABASE_URL trong .env còn chỗ chưa điền: ${placeholder[0]}. ` +
        "Lấy mật khẩu ở Supabase Dashboard > Connect (hoặc Settings > Database > " +
        "Reset database password). Ký tự đặc biệt phải URL-encode.",
    );
  }

  // Mật khẩu chứa @ mà không encode thành %40. Chỗ này độc: chuỗi vẫn "trông
  // đúng", `prisma db push` có thể vẫn chạy (nó cắt ở @ cuối), nhưng bộ phân
  // tích khác lại cắt ở @ đầu và đi tìm hostname là đoạn giữa mật khẩu.
  const afterScheme = url.slice(url.indexOf("://") + 3);
  const lastAt = afterScheme.lastIndexOf("@");
  if (lastAt > 0 && afterScheme.slice(0, lastAt).includes("@")) {
    throw new DatabaseUrlError(
      "DATABASE_URL có dấu `@` trong mật khẩu chưa được URL-encode — phải đổi " +
        "thành `%40`. (Các ký tự khác: # → %23, / → %2F, : → %3A, ? → %3F.)",
    );
  }

  if (url.includes(":6543") && !url.includes("pgbouncer=true")) {
    throw new DatabaseUrlError(
      "DATABASE_URL trỏ vào pooler (cổng 6543) nhưng thiếu `?pgbouncer=true`. " +
        "Xem docs/supabase.md.",
    );
  }
}
