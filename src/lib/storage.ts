/**
 * Lưu file ảnh.
 *
 * MVP ghi xuống đĩa local. Trước khi có người dùng thật phải đổi sang S3/R2 —
 * chỉ cần thay thân 3 hàm dưới, phần còn lại của app chỉ biết tới `key`.
 */

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.env.STORAGE_DIR ?? "./storage");

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

const EXT: Record<AllowedMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function safeKeyToPath(key: string): string {
  // Chặn ../ — key đến từ URL.
  const resolved = path.resolve(ROOT, key);
  if (!resolved.startsWith(ROOT + path.sep)) {
    throw new Error("Key không hợp lệ");
  }
  return resolved;
}

export async function putImage(args: {
  userId: string;
  data: Buffer;
  mime: AllowedMime;
  prefix?: string;
}): Promise<string> {
  const ext = EXT[args.mime];
  const key = path.posix.join(
    args.userId,
    args.prefix ?? "raw",
    `${randomUUID()}.${ext}`,
  );
  const dest = safeKeyToPath(key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, args.data);
  return key;
}

export async function getImage(
  key: string,
): Promise<{ data: Buffer; mime: string }> {
  const data = await readFile(safeKeyToPath(key));
  const ext = path.extname(key).slice(1).toLowerCase();
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { data, mime };
}

export function publicUrl(key: string): string {
  return `/api/files/${key}`;
}

export function checksum(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

export function isAllowedMime(m: string): m is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(m);
}
