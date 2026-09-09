/**
 * Ranh giới "một ngày" theo múi giờ người dùng.
 *
 * Database lưu UTC. Nếu lấy nửa đêm UTC làm mốc thì với người Việt (UTC+7) hạn
 * mức reset lúc 7 giờ sáng — sai mà không có lỗi nào báo.
 */

/** Thời điểm UTC ứng với 00:00 hôm nay ở `timeZone`. */
export function startOfDayIn(timeZone: string, now = new Date()): Date {
  // Lấy Y/M/D theo múi giờ đích, rồi dựng lại mốc nửa đêm của chính múi giờ đó.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;

  // Độ lệch của múi giờ tại đúng thời điểm này (tự đúng cả khi có DST).
  const offsetMs = offsetOf(timeZone, now);
  return new Date(Date.parse(`${ymd}T00:00:00Z`) - offsetMs);
}

/** Số ngày trọn vẹn đã trôi qua kể từ `from`, đếm theo lịch của `timeZone`. */
export function daysSince(from: Date, timeZone: string, now = new Date()): number {
  const a = startOfDayIn(timeZone, from).getTime();
  const b = startOfDayIn(timeZone, now).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function offsetOf(timeZone: string, at: Date): number {
  // So giờ "đọc được" ở múi giờ đích với giờ UTC để suy ra độ lệch.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(
    dtf.formatToParts(at).map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}
