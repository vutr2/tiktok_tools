/**
 * Vòng đời một lần sinh nội dung.
 *
 *   PENDING  → tạo bản ghi
 *   DEBIT    → trừ credit (nếu thiếu: dừng ở đây, chưa tốn một đồng API nào)
 *   RUNNING  → gọi provider
 *   SUCCEEDED / FAILED + REFUND
 *
 * Mọi endpoint sinh nội dung PHẢI đi qua hàm này. Không route nào được gọi
 * provider trực tiếp.
 */

import type { GenerationType, Industry, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { debit, getBalance, refundGeneration } from "./credits";
import { AppError } from "./errors";

export type RunResult<T> = {
  generationId: string;
  output: T;
  creditsCharged: number;
  balanceAfter: number;
};

export async function runGeneration<T>(args: {
  userId: string;
  productId?: string;
  type: GenerationType;
  industry: Industry;
  credits: number;
  input: Prisma.InputJsonValue;
  provider: string;
  /**
   * Trả về output + chi phí thật (VND) nếu provider báo. Chi phí được ghi vào
   * generations.providerCostVnd — đây là dữ liệu để chốt tỷ lệ credit sau này.
   */
  run: (ctx: { generationId: string }) => Promise<{
    output: T;
    providerCostVnd?: number | null;
    providerJobId?: string | null;
  }>;
}): Promise<RunResult<T>> {
  if (args.credits < 0) throw new Error("credits không được âm");

  const generation = await prisma.generation.create({
    data: {
      userId: args.userId,
      productId: args.productId,
      type: args.type,
      industry: args.industry,
      status: "PENDING",
      input: args.input,
      provider: args.provider,
    },
  });

  /**
   * Gói trọn đời: không trừ credit.
   *
   * Nhưng generation VẪN được ghi và `providerCostVnd` vẫn được lưu — đó là
   * cách duy nhất biết một người dùng trọn đời đã tốn của mình bao nhiêu. Bán
   * không giới hạn mà không đo thì không bao giờ biết mình đang lỗ ở đâu.
   */
  const { plan } = await prisma.user.findUniqueOrThrow({
    where: { id: args.userId },
    select: { plan: true },
  });
  const unlimited = plan === "LIFETIME";

  // 1. Trừ trước. Ném InsufficientCreditsError nếu không đủ — chưa gọi API.
  let balanceAfter: number;
  if (unlimited) {
    balanceAfter = await getBalance(args.userId);
  } else {
  try {
    const res = await debit({
      userId: args.userId,
      amount: args.credits,
      idempotencyKey: `debit:${generation.id}`,
      generationId: generation.id,
      note: `${args.type}`,
    });
    balanceAfter = res.balanceAfter;
  } catch (err) {
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "FAILED",
        errorCode: err instanceof AppError ? err.code : "DEBIT_FAILED",
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    });
    throw err;
  }
  }

  await prisma.generation.update({
    where: { id: generation.id },
    data: {
      status: "RUNNING",
      creditsCharged: unlimited ? 0 : args.credits,
    },
  });

  // 2. Gọi provider.
  try {
    const { output, providerCostVnd, providerJobId } = await args.run({
      generationId: generation.id,
    });

    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "SUCCEEDED",
        output: output as Prisma.InputJsonValue,
        providerCostVnd: providerCostVnd ?? null,
        providerJobId: providerJobId ?? null,
        completedAt: new Date(),
      },
    });

    return {
      generationId: generation.id,
      output,
      creditsCharged: args.credits,
      balanceAfter,
    };
  } catch (err) {
    // 3. Lỗi provider = lỗi của mình, không phải của người dùng. Hoàn đủ.
    //    Người trọn đời không bị trừ nên cũng không có gì để hoàn.
    if (!unlimited) {
      await refundGeneration({
        userId: args.userId,
        generationId: generation.id,
        amount: args.credits,
        reason: err instanceof Error ? err.message : String(err),
      });
    }

    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: "FAILED",
        creditsCharged: 0,
        errorCode: err instanceof AppError ? err.code : "PROVIDER_ERROR",
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    });

    throw err;
  }
}
