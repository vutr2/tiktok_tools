/**
 * Đọc timestamp từ Postgres.
 *
 * Cột sinh bởi Prisma là `timestamp` KHÔNG kèm múi giờ. Prisma tự gắn UTC khi
 * đọc; supabase-js trả nguyên chuỗi `2026-09-04T16:59:41.571`, và
 * `new Date(chuỗi_đó)` hiểu là GIỜ ĐỊA PHƯƠNG.
 *
 * Ở Việt Nam (UTC+7) sai lệch 7 tiếng — đủ để mọi phiên đăng nhập bị coi là hết
 * hạn ngay khi vừa tạo. Lỗi này im lặng: không ném gì, chỉ đăng xuất tất cả.
 */
export function pgDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  // Có Z hoặc ±hh:mm ở cuối thì đã đủ thông tin múi giờ.
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

/** Như `pgDate` nhưng dùng cho cột NOT NULL. */
export function pgDateRequired(value: string | Date): Date {
  const d = pgDate(value);
  if (!d) throw new Error("Thiếu giá trị thời gian");
  return d;
}
