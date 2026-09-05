import { randomUUID } from "node:crypto";

/**
 * Sinh id cho bản ghi mới.
 *
 * Cột `id` KHÔNG có default trong database — Prisma từng sinh `cuid()` ở tầng
 * ứng dụng, nên khi bỏ Prisma thì trách nhiệm đó rơi về đây. Quên truyền id là
 * lỗi `null value in column "id" violates not-null constraint`.
 *
 * Dùng UUID thay vì cuid: không thêm dependency, và id chỉ cần duy nhất chứ
 * không cần sắp xếp được. Bản ghi cũ vẫn là cuid — hai dạng sống chung vô hại
 * vì cột chỉ là `text`.
 */
export function newId(): string {
  return randomUUID();
}
