/**
 * Nạp credit.
 *
 * MVP dùng chuyển khoản ngân hàng — cách gần như mọi shop Việt bắt đầu, không
 * phải chờ duyệt cổng thanh toán. Đổi sang PSP thật chỉ cần thêm một provider ở
 * đây và một endpoint webhook; sổ credit không đổi.
 */

import { prisma } from "./db";
import { credit } from "./credits";
import { AppError } from "./errors";
import { getPack } from "./pricing";

/** Mã nội dung chuyển khoản. Ngắn, không nhầm chữ O/0, I/1. */
function transferCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `TT${out}`;
}

export async function createPayment(args: { userId: string; packId: string }) {
  const pack = getPack(args.packId);
  if (!pack || !pack.enabled) {
    throw new AppError("PACK_NOT_FOUND", "Gói không tồn tại hoặc đang tắt", 404);
  }

  return prisma.payment.create({
    data: {
      userId: args.userId,
      packId: pack.id,
      amountVnd: pack.priceVnd,
      credits: pack.credits,
      provider: "bank_transfer",
      providerRef: transferCode(),
      status: "PENDING",
    },
  });
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
  const payment = await prisma.payment.findFirst({
    where: {
      providerRef: args.providerRef,
      provider: args.provider ?? "bank_transfer",
    },
  });
  if (!payment) {
    throw new AppError("PAYMENT_NOT_FOUND", "Không tìm thấy giao dịch", 404);
  }

  if (payment.status === "PAID") {
    return { payment, alreadyPaid: true };
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      raw: (args.raw ?? null) as never,
    },
  });

  await credit({
    userId: payment.userId,
    amount: payment.credits,
    type: "TOPUP",
    idempotencyKey: `topup:${payment.id}`,
    paymentId: payment.id,
    note: `Nạp gói ${payment.packId}`,
  });

  return { payment: updated, alreadyPaid: false };
}
