import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { db } from "./supabase";

/**
 * Lưu ảnh trên Supabase Storage.
 *
 * Trước đây ghi xuống đĩa (`./storage`). Trên Vercel hệ tập tin chỉ đọc nên
 * upload chết `ENOENT /var/task`, và kể cả ghi được thì mỗi lần deploy là mất
 * sạch ảnh.
 *
 * Bucket để RIÊNG TƯ. Trình duyệt xem ảnh bằng **signed URL** — đường dẫn có
 * chữ ký, hết hạn sau một giờ. Ảnh đi thẳng từ CDN Supabase về máy người dùng,
 * không chạy qua server Next, nên không tốn băng thông Vercel.
 *
 * Phần còn lại của app chỉ biết tới `key`. Đổi chỗ lưu lần nữa thì vẫn chỉ sửa
 * trong file này.
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "product-images";

/** Signed URL sống bao lâu. Trang render lại mỗi request nên không cần dài. */
const SIGNED_URL_TTL = 60 * 60;

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

const EXT: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function putImage(args: {
  userId: string;
  data: Buffer;
  mime: AllowedMime;
  prefix?: string;
}): Promise<string> {
  // Key bắt đầu bằng userId — vừa để phân vùng, vừa để soi log biết ảnh của ai.
  const key = [args.userId, args.prefix ?? "raw", `${randomUUID()}.${EXT[args.mime]}`].join(
    "/",
  );

  const { error } = await db.storage
    .from(BUCKET)
    .upload(key, args.data, { contentType: args.mime, upsert: false });

  if (error) throw new Error(`Không lưu được ảnh: ${error.message}`);
  return key;
}

/**
 * Đọc ảnh về dạng Buffer.
 *
 * Dùng phía server: tách nền cần đọc ảnh gốc, sinh mô tả cần gửi ảnh cho model.
 * Trình duyệt thì dùng `signedUrl` chứ không đi đường này.
 */
export async function getImage(
  key: string,
): Promise<{ data: Buffer; mime: string }> {
  const { data, error } = await db.storage.from(BUCKET).download(key);
  if (error || !data) {
    throw new Error(`Không đọc được ảnh ${key}: ${error?.message ?? "rỗng"}`);
  }
  return {
    data: Buffer.from(await data.arrayBuffer()),
    mime: data.type || mimeFromKey(key),
  };
}

/** Một signed URL. Cần nhiều thì dùng `signedUrls` — nó gộp thành một lần gọi. */
export async function signedUrl(
  key: string,
  expiresIn = SIGNED_URL_TTL,
): Promise<string | null> {
  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrl(key, expiresIn);
  return error ? null : (data?.signedUrl ?? null);
}

/**
 * Ký nhiều key trong MỘT lần gọi.
 *
 * Lưới sản phẩm có N ảnh; ký từng cái là N lần gọi mạng nối tiếp nhau, trang
 * chậm thấy rõ. Trả về Map để nơi gọi tra theo key.
 */
export async function signedUrls(
  keys: string[],
  expiresIn = SIGNED_URL_TTL,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return out;

  const { data, error } = await db.storage
    .from(BUCKET)
    .createSignedUrls(unique, expiresIn);
  if (error || !data) return out;

  for (const row of data) {
    // `path` có thể null nếu key đó lỗi — bỏ qua, nơi gọi tự xử lý thiếu ảnh.
    if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  }
  return out;
}

export async function removeImages(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await db.storage.from(BUCKET).remove(keys);
}

function mimeFromKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
}

export function checksum(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

export function isAllowedMime(m: string): m is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(m);
}
