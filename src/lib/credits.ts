/**
 * Sổ credit.
 *
 * Luật bất di bất dịch:
 *   1. TRỪ TRƯỚC khi gọi API ngoài.
 *   2. HOÀN LẠI khi provider lỗi.
 *   3. Làm ngược lại là mất tiền — user bấm 50 lần, API chạy 50 lần, ví vẫn đầy.
 *
 * `credit_transactions` là sổ cái append-only. `credit_wallet.balance` chỉ là
 * bản chiếu nhanh; muốn đối soát thì cộng dồn sổ cái, xem `auditWallet()`.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { InsufficientCreditsError } from "./errors";

type Tx = Prisma.TransactionClient | PrismaClient;

export async function ensureWallet(userId: string, db: Tx = prisma) {
  const existing = await db.creditWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.creditWallet.create({ data: { userId, balance: 0 } });
}

export async function getBalance(userId: string): Promise<number> {
  const wallet = await prisma.creditWallet.findUnique({ where: { userId } });
  return wallet?.balance ?? 0;
}

/**
 * Trừ credit một cách nguyên tử.
 *
 * `updateMany` với điều kiện `balance >= amount` biên dịch thành một câu
 * UPDATE ... WHERE duy nhất, nên hai request song song không thể cùng trừ trên
 * một số dư. Không dùng read-then-write.
 */
export async function debit(args: {
  userId: string;
  amount: number;
  idempotencyKey: string;
  generationId?: string;
  note?: string;
}): Promise<{ balanceAfter: number; alreadyApplied: boolean }> {
  if (args.amount <= 0) throw new Error("amount phải > 0");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey: args.idempotencyKey },
    });
    if (existing) {
      return { balanceAfter: existing.balanceAfter, alreadyApplied: true };
    }

    const wallet = await ensureWallet(args.userId, tx);

    const updated = await tx.creditWallet.updateMany({
      where: { id: wallet.id, balance: { gte: args.amount } },
      data: {
        balance: { decrement: args.amount },
        totalOut: { increment: args.amount },
      },
    });

    if (updated.count === 0) {
      const fresh = await tx.creditWallet.findUniqueOrThrow({
        where: { id: wallet.id },
      });
      throw new InsufficientCreditsError(args.amount, fresh.balance);
    }

    const after = await tx.creditWallet.findUniqueOrThrow({
      where: { id: wallet.id },
    });

    await tx.creditTransaction.create({
      data: {
        userId: args.userId,
        walletId: wallet.id,
        type: "DEBIT",
        delta: -args.amount,
        balanceAfter: after.balance,
        idempotencyKey: args.idempotencyKey,
        generationId: args.generationId,
        note: args.note,
      },
    });

    return { balanceAfter: after.balance, alreadyApplied: false };
  });
}

/** Cộng credit. Dùng cho TOPUP / BONUS / REFUND / ADJUSTMENT. */
export async function credit(args: {
  userId: string;
  amount: number;
  type: "TOPUP" | "BONUS" | "REFUND" | "ADJUSTMENT";
  idempotencyKey: string;
  generationId?: string;
  paymentId?: string;
  note?: string;
}): Promise<{ balanceAfter: number; alreadyApplied: boolean }> {
  if (args.amount <= 0) throw new Error("amount phải > 0");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.creditTransaction.findUnique({
      where: { idempotencyKey: args.idempotencyKey },
    });
    if (existing) {
      return { balanceAfter: existing.balanceAfter, alreadyApplied: true };
    }

    const wallet = await ensureWallet(args.userId, tx);
    const after = await tx.creditWallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: args.amount },
        totalIn: { increment: args.amount },
      },
    });

    await tx.creditTransaction.create({
      data: {
        userId: args.userId,
        walletId: wallet.id,
        type: args.type,
        delta: args.amount,
        balanceAfter: after.balance,
        idempotencyKey: args.idempotencyKey,
        generationId: args.generationId,
        paymentId: args.paymentId,
        note: args.note,
      },
    });

    return { balanceAfter: after.balance, alreadyApplied: false };
  });
}

/**
 * Hoàn credit cho một generation lỗi.
 *
 * Idempotency key gắn với generationId nên gọi lại bao nhiêu lần cũng chỉ hoàn
 * đúng một lần — quan trọng vì retry và webhook đều có thể chạm vào đây.
 */
export async function refundGeneration(args: {
  userId: string;
  generationId: string;
  amount: number;
  reason: string;
}): Promise<void> {
  if (args.amount <= 0) return;
  await credit({
    userId: args.userId,
    amount: args.amount,
    type: "REFUND",
    idempotencyKey: `refund:${args.generationId}`,
    generationId: args.generationId,
    note: `Hoàn credit: ${args.reason}`,
  });
}

/** Đối soát: số dư ví phải khớp tổng sổ cái. Chạy định kỳ hoặc khi có khiếu nại. */
export async function auditWallet(userId: string): Promise<{
  walletBalance: number;
  ledgerBalance: number;
  drift: number;
}> {
  const wallet = await ensureWallet(userId);
  const agg = await prisma.creditTransaction.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  const ledgerBalance = agg._sum.delta ?? 0;
  return {
    walletBalance: wallet.balance,
    ledgerBalance,
    drift: wallet.balance - ledgerBalance,
  };
}
