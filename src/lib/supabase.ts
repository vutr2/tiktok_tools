import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Client Supabase phía server.
 *
 * Dùng SERVICE ROLE key — key này bỏ qua RLS, tương đương quyền của role
 * `postgres` mà Prisma từng dùng. `import "server-only"` là chốt chặn cứng:
 * lỡ tay import file này vào component client thì build gãy ngay, thay vì âm
 * thầm nhét key toàn quyền vào bundle trình duyệt.
 *
 * Khởi tạo LƯỜI, cùng lý do như bên Prisma trước đây: `next build` có import
 * từng route để thu thập metadata, và lúc đó biến môi trường runtime thường
 * chưa tồn tại. Ném lỗi lúc import là làm hỏng build vì thứ chỉ cần khi chạy.
 */

export type Db = SupabaseClient<Database>;

let cached: Db | null = null;

function missing(name: string): never {
  throw new Error(
    `Thiếu ${name}.\n` +
      "  • Máy cá nhân: thêm vào .env\n" +
      "  • Vercel/hosting: thêm vào Environment Variables (tick cả Production " +
      "lẫn Preview) rồi DEPLOY LẠI.\n" +
      "  Lấy ở Supabase Dashboard > Project Settings > API.",
  );
}

function create(): Db {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) missing("NEXT_PUBLIC_SUPABASE_URL");
  if (!key) missing("SUPABASE_SERVICE_ROLE_KEY");

  return createClient<Database>(url, key, {
    // Không có người dùng đăng nhập ở tầng Supabase — phiên do app tự quản
    // (cookie tt_session + bảng sessions). Tắt hết để SDK khỏi giữ trạng thái.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    cached ??= create();
    const value = Reflect.get(cached, prop, receiver);
    return typeof value === "function" ? value.bind(cached) : value;
  },
});

/**
 * supabase-js trả `{ data, error }` chứ không ném. Bọc lại để lỗi không bị nuốt
 * — quên kiểm `error` một lần là dữ liệu sai chảy tiếp mà không ai biết.
 */
export function unwrap<T>(
  res: { data: T; error: { message: string; code?: string } | null },
  what: string,
): T {
  if (res.error) {
    throw new Error(`${what}: ${res.error.message}`);
  }
  return res.data;
}

/**
 * Như `unwrap` nhưng khẳng định có dòng.
 *
 * `.single()` đã ném lỗi khi không có dòng, nhưng kiểu vẫn là `T | null` nên
 * TypeScript bắt kiểm null ở mọi nơi gọi. Dùng cái này cho các truy vấn bắt
 * buộc phải có kết quả.
 */
export function unwrapOne<T>(
  res: { data: T | null; error: { message: string; code?: string } | null },
  what: string,
): NonNullable<T> {
  // NonNullable là bắt buộc: `data` vốn đã là `Row | null`, nên nếu để trả `T`
  // thì TypeScript suy ra T = Row | null và null vẫn lọt qua.
  const row = unwrap(res, what);
  if (row === null || row === undefined) {
    throw new Error(`${what}: không có dữ liệu trả về`);
  }
  return row as NonNullable<T>;
}
