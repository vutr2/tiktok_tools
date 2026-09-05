/**
 * Quyền dùng — thay cho toàn bộ hệ credit.
 *
 * Luật cũ: trừ credit trước khi gọi API, hoàn lại nếu lỗi. Cần sổ cái, cần
 * transaction, cần đối soát.
 *
 * Luật mới, đơn giản hơn hẳn: đếm số lần sinh THÀNH CÔNG. Chưa mua gói mà đã
 * vượt hạn mức thì chặn. Không có sổ cái, không có gì để trôi lệch — con số
 * luôn dựng lại được từ chính bảng `generations`.
 *
 * Vì chỉ đếm lần THÀNH CÔNG nên lần gọi hỏng không tính vào hạn mức của người
 * dùng — đúng tinh thần "hoàn credit khi lỗi" của luật cũ, mà không cần hoàn gì.
 */

import { db } from "./supabase";
import { FREE_TRIAL_GENERATIONS } from "./pricing";
import { TrialExhaustedError } from "./errors";

export type Entitlement = {
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
};

export async function getEntitlement(userId: string): Promise<Entitlement> {
  const { data: user } = await db
    .from("users")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (user?.plan === "LIFETIME") {
    return {
      unlimited: true,
      used: 0,
      limit: FREE_TRIAL_GENERATIONS,
      remaining: Infinity,
    };
  }

  // head:true = chỉ lấy số đếm, không kéo dòng về.
  const { count } = await db
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("status", "SUCCEEDED");

  const used = count ?? 0;
  return {
    unlimited: false,
    used,
    limit: FREE_TRIAL_GENERATIONS,
    remaining: Math.max(0, FREE_TRIAL_GENERATIONS - used),
  };
}

/** Ném TrialExhaustedError nếu hết lượt. Gọi TRƯỚC khi chạm vào API tốn tiền. */
export async function requireEntitlement(
  userId: string,
  need = 1,
): Promise<Entitlement> {
  const e = await getEntitlement(userId);
  if (!e.unlimited && e.remaining < need) {
    throw new TrialExhaustedError(e.used, e.limit);
  }
  return e;
}
