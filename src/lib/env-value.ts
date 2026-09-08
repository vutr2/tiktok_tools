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
    `NEXT_PUBLIC_SUPABASE_URL không phải URL hợp lệ: ${JSON.stringify(url)}\n` +
    "  Phải có dạng https://<project-ref>.supabase.co\n" +
    "  • Trên Vercel: dán giá trị KHÔNG kèm dấu nháy — ô đó không tự bỏ nháy như file .env.\n" +
    "  • NEXT_PUBLIC_ được nhúng cứng lúc build, nên sửa xong phải DEPLOY LẠI."
  );
}
