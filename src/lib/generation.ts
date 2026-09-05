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

import type { Industry } from "./industries";
import type { Database, Json } from "./database.types";

type GenerationType = Database["public"]["Enums"]["GenerationType"];
import { db, unwrap } from "./supabase";
import { newId } from "./ids";
import { requireEntitlement } from "./entitlement";
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
  input: Json;
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

  const generation = unwrap(
    await db
      .from("generations")
      .insert({
        id: newId(),
        userId: args.userId,
        productId: args.productId ?? null,
        type: args.type,
        industry: args.industry,
        status: "PENDING",
        input: args.input as never,
        provider: args.provider,
        updatedAt: new Date().toISOString(),
      })
      .select("id")
      .single(),
    "tạo generation",
  );
  if (!generation) throw new Error("Không tạo được generation");

  // Chặn TRƯỚC khi chạm API tốn tiền. Hết lượt dùng thử thì ném ở đây,
  // generation ghi nhận FAILED và không có lời gọi provider nào xảy ra.
  try {
    await requireEntitlement(args.userId);
  } catch (err) {
    await db
      .from("generations")
      .update({
        status: "FAILED",
        errorCode: err instanceof AppError ? err.code : "NOT_ENTITLED",
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", generation.id);
    throw err;
  }

  await db
    .from("generations")
    .update({
      status: "RUNNING",
      updatedAt: new Date().toISOString(),
    })
    .eq("id", generation.id);

  // 2. Gọi provider.
  try {
    const { output, providerCostVnd, providerJobId } = await args.run({
      generationId: generation.id,
    });

    await db
      .from("generations")
      .update({
        status: "SUCCEEDED",
        output: output as never,
        providerCostVnd: providerCostVnd ?? null,
        providerJobId: providerJobId ?? null,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", generation.id);

    return {
      generationId: generation.id,
      output,
      creditsCharged: 0,
      balanceAfter: 0,
    };
  } catch (err) {
    // 3. Lỗi provider = lỗi của mình, không phải của người dùng.
    //    Không cần hoàn gì: `getEntitlement` chỉ đếm generation SUCCEEDED,
    //    nên lần hỏng tự động không tính vào hạn mức dùng thử.
    await db
      .from("generations")
      .update({
        status: "FAILED",
        creditsCharged: 0,
        errorCode: err instanceof AppError ? err.code : "PROVIDER_ERROR",
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", generation.id);

    throw err;
  }
}
