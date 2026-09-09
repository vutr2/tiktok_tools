/**
 * Đọc và kiểm biến môi trường.
 *
 * Tách khỏi supabase.ts để test được: file đó có `import "server-only"` nên
 * không nạp được ngoài môi trường server của Next.
 */

/**
 * Bỏ dấu nháy bao quanh nếu có.
 *
 * File .env cho phép `KEY='giá trị'` và dotenv tự bỏ nháy. Ô Environment
 * Variables trên Vercel thì KHÔNG — dán nguyên dòng từ .env vào đó là giá trị
 * mang luôn hai dấu nháy, rồi SDK ném "Invalid supabaseUrl" mà không nói vì sao.
 */
export function cleanEnv(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t) return undefined;
  const unquoted = t.replace(/^(['"])([\s\S]*)\1$/, "$2").trim();
  return unquoted || undefined;
}

/**
 * Đọc biến môi trường dạng số, có giá trị mặc định.
 *
 * Đừng viết `Number(process.env.X ?? mặc_định)`. `??` chỉ nhảy sang mặc định
 * khi biến là `undefined`; biến CÓ MẶT nhưng RỖNG thì không nhảy, và
 * `Number("")` bằng 0. Không có lỗi, không có cảnh báo — chỉ là tỉ giá 0 khiến
 * gói $200 hiện ra "≈ 0đ", hoặc TRIAL_DAYS bằng 0 khiến mọi người dùng hết hạn
 * dùng thử ngay lúc đăng ký.
 *
 * Còn nguyên dấu nháy (bẫy của ô Environment Variables trên Vercel) thì
 * `Number('"26300"')` ra NaN — `cleanEnv` lo phần đó.
 *
 * Giá trị trống, không phải số, hoặc nhỏ hơn `min` đều bị coi như KHÔNG ĐẶT.
 */
export function envNumberOr(
  raw: string | undefined,
  fallback: number,
  { min }: { min?: number } = {},
): number {
  const cleaned = cleanEnv(raw);
  if (cleaned === undefined) return fallback;

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return fallback;
  if (min !== undefined && n < min) return fallback;
  return n;
}

/** Ném lỗi nói rõ sai chỗ nào, thay vì để SDK ném một câu không dùng được. */
export function assertSupabaseUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(badUrl(url));
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(badUrl(url));
  }
}

function badUrl(url: string): string {
  return (
    `SUPABASE_URL không phải URL hợp lệ: ${JSON.stringify(url)}\n` +
    "  Phải có dạng https://<project-ref>.supabase.co\n" +
    "  • Trên Vercel: dán giá trị KHÔNG kèm dấu nháy — ô đó không tự bỏ nháy như file .env.\n" +
    "  • Dùng tên SUPABASE_URL (không có tiền tố NEXT_PUBLIC_): biến có tiền tố\n" +
    "    bị nướng cứng lúc build, đặt lại trên hosting cũng vô ích tới khi deploy lại."
  );
}
