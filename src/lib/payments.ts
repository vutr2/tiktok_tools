/**
 * Nạp credit.
 *
 * MVP dùng chuyển khoản ngân hàng — cách gần như mọi shop Việt bắt đầu, không
 * phải chờ duyệt cổng thanh toán. Đổi sang PSP thật chỉ cần thêm một provider ở
 * đây và một endpoint webhook; sổ credit không đổi.
 */

import { db, unwrapOne } from "./supabase";
import type { Database } from "./database.types";

/** Kiểu dòng payments — khai báo tường minh vì inference của supabase-js
 *  không xuyên qua được `.insert().select().single()`. */
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
import { newId } from "./ids";
import { AppError } from "./errors";
import { getPack, LIFETIME_PLAN, lifetimePriceVnd } from "./pricing";

/** Mã nội dung chuyển khoản. Ngắn, không nhầm chữ O/0, I/1. */
function transferCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `TT${out}`;
}

export async function createPayment(args: {
  userId: string;
  packId: string;
}): Promise<PaymentRow> {
  // Gói trọn đời không nằm trong PACKS vì nó không bán credit — nó mở khoá
  // không giới hạn. credits = 0 để sổ cái không cộng nhầm gì.
  if (args.packId === LIFETIME_PLAN.id) {
    const { data: already } = await db
      .from("users")
      .select("plan")
      .eq("id", args.userId)
      .maybeSingle();
    if (already?.plan === "LIFETIME") {
      throw new AppError("ALREADY_LIFETIME", "Bạn đã có gói trọn đời rồi.", 409);
    }

    return unwrapOne(
      await db
        .from("payments")
        .insert({
          id: newId(),
          userId: args.userId,
          packId: LIFETIME_PLAN.id,
          amountVnd: lifetimePriceVnd(),
          credits: 0,
          provider: "sepay",
          providerRef: transferCode(),
          status: "PENDING",
          updatedAt: new Date().toISOString(),
        })
        .select("*")
        .single(),
      "tạo đơn trọn đời",
    );
  }

  const pack = getPack(args.packId);
  if (!pack || !pack.enabled) {
    throw new AppError("PACK_NOT_FOUND", "Gói không tồn tại hoặc đang tắt", 404);
  }

  return unwrapOne(
    await db
      .from("payments")
      .insert({
        id: newId(),
        userId: args.userId,
        packId: pack.id,
        amountVnd: pack.priceVnd,
        credits: pack.credits,
        provider: "sepay",
        providerRef: transferCode(),
        status: "PENDING",
        updatedAt: new Date().toISOString(),
      })
      .select("*")
      .single(),
    "tạo đơn",
  );
}

/**
 * Xác nhận đã nhận tiền → cộng credit.
 *
 * Idempotent theo paymentId: webhook bắn lại hay bấm xác nhận hai lần cũng chỉ
 * cộng một lần.
 */
export async function markPaid(args: {
  providerRef: string;
  provider?: string;
  raw?: unknown;
}) {
  const { data: payment } = await db
    .from("payments")
    .select("*")
    .eq("providerRef", args.providerRef)
    .eq("provider", args.provider ?? "sepay")
    .maybeSingle();
  if (!payment) {
    throw new AppError("PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch", 404);
  }

  if (payment.status === "PAID") {
    return { payment, alreadyPaid: true };
  }

  const updated = unwrapOne(
    await db
      .from("payments")
      .update({
        status: "PAID",
        paidAt: new Date().toISOString(),
        raw: (args.raw ?? null) as never,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .select("*")
      .single(),
    "đánh dấu đã trả",
  );

  // Chỉ còn một sản phẩm: gói trọn đời. Trả tiền = mở khoá không giới hạn.
  // `eq("plan","FREE")` để webhook bắn trùng cũng chỉ bật một lần và không ghi
  // đè mốc kích hoạt đầu tiên.
  await db
    .from("users")
    .update({
      plan: "LIFETIME",
      planActivatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq("id", payment.userId)
    .eq("plan", "FREE");

  return { payment: updated, alreadyPaid: false };
}

/**
 * Huỷ một đơn chưa thanh toán.
 *
 * Bấm "Mua ngay" là tạo đơn PENDING kèm mã chuyển khoản. Đổi ý mà không huỷ
 * được thì đơn treo mãi, và lần sau tạo đơn mới lại sinh mã khác — đối soát
 * thành mớ bòng bong.
 *
 * Chỉ huỷ được đơn của CHÍNH mình và chỉ khi còn PENDING: đơn đã trả tiền mà
 * huỷ được thì mất tiền thật.
 */
export async function cancelPayment(args: {
  userId: string;
  paymentId: string;
}) {
  const { data: payment } = await db
    .from("payments")
    .select("*")
    .eq("id", args.paymentId)
    .eq("userId", args.userId)
    .maybeSingle();

  if (!payment) {
    throw new AppError("PAYMENT_NOT_FOUND", "Không tìm thấy đơn", 404);
  }
  if (payment.status === "PAID") {
    throw new AppError(
      "ALREADY_PAID",
      "Đơn đã thanh toán, không huỷ được. Liên hệ hỗ trợ nếu cần hoàn tiền.",
      409,
    );
  }
  if (payment.status !== "PENDING") {
    return { payment, alreadyCancelled: true };
  }

  const updated = unwrapOne(
    await db
      .from("payments")
      .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "PENDING")
      .select("*")
      .single(),
    "huỷ đơn",
  );

  return { payment: updated, alreadyCancelled: false };
}

/** Đơn chưa thanh toán gần nhất — để giao diện hiện lại mã chuyển khoản. */
export async function pendingPayment(userId: string) {
  const { data } = await db
    .from("payments")
    .select("*")
    .eq("userId", userId)
    .eq("status", "PENDING")
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

