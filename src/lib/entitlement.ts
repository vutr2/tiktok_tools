/**
 * Quyền dùng — thay cho toàn bộ hệ credit.
 *
 * Luật: dùng thử 3 ngày, mỗi ngày 3 lượt. Hết ngày thứ 3 hoặc hết lượt hôm nay
 * thì chặn, mời mua gói trọn đời.
 *
 * Không có sổ cái, không có gì để trôi lệch — mọi con số dựng lại được từ bảng
 * `generations`. Và vì chỉ đếm lần THÀNH CÔNG, lần gọi hỏng không tính vào hạn
 * mức của người dùng.
 */

import { db } from "./supabase";
import { TRIAL_DAYS, TRIAL_PER_DAY, TRIAL_TIMEZONE } from "./pricing";
import { daysSince, startOfDayIn } from "./day";
import { pgDateRequired } from "./dates";
import { TrialExhaustedError } from "./errors";

export type Entitlement = {
  unlimited: boolean;
  /** Đã dùng bao nhiêu lượt trong ngày hôm nay. */
  usedToday: number;
  perDay: number;
  /** Còn bao nhiêu lượt hôm nay. */
  remaining: number;
  /** Còn bao nhiêu ngày dùng thử, tính cả hôm nay. 0 = đã hết hạn. */
  daysLeft: number;
  /** Hết hạn 3 ngày rồi (khác với "hết lượt hôm nay"). */
  expired: boolean;
};

export async function getEntitlement(userId: string): Promise<Entitlement> {
  const { data: user } = await db
    .from("users")
    .select("plan,createdAt")
    .eq("id", userId)
    .maybeSingle();

  if (user?.plan === "LIFETIME") {
    return {
      unlimited: true,
      usedToday: 0,
      perDay: TRIAL_PER_DAY,
      remaining: Infinity,
      daysLeft: Infinity,
      expired: false,
    };
  }

  const signedUp = user ? pgDateRequired(user.createdAt) : new Date();
  const dayIndex = daysSince(signedUp, TRIAL_TIMEZONE);
  const daysLeft = Math.max(0, TRIAL_DAYS - dayIndex);
  const expired = daysLeft === 0;

  if (expired) {
    return {
      unlimited: false,
      usedToday: 0,
      perDay: TRIAL_PER_DAY,
      remaining: 0,
      daysLeft: 0,
      expired: true,
    };
  }

  // Đếm lượt đã dùng TỪ NỬA ĐÊM HÔM NAY theo giờ Việt Nam, không phải giờ UTC.
  const since = startOfDayIn(TRIAL_TIMEZONE).toISOString();
  const { count } = await db
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("status", "SUCCEEDED")
    .gte("createdAt", since);

  const usedToday = count ?? 0;
  return {
    unlimited: false,
    usedToday,
    perDay: TRIAL_PER_DAY,
    remaining: Math.max(0, TRIAL_PER_DAY - usedToday),
    daysLeft,
    expired: false,
  };
}

/** Ném TrialExhaustedError nếu không đủ lượt. Gọi TRƯỚC khi chạm API tốn tiền. */
export async function requireEntitlement(
  userId: string,
  need = 1,
): Promise<Entitlement> {
  const e = await getEntitlement(userId);
  if (!e.unlimited && e.remaining < need) {
    throw new TrialExhaustedError(e.usedToday, e.perDay, e.expired);
  }
  return e;
}
