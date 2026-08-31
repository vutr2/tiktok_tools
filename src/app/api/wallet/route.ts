import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getBalance } from "@/lib/credits";
import { activePacks, CREDIT_COST } from "@/lib/pricing";
import { fail, ok } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const [balance, transactions] = await Promise.all([
      getBalance(user.id),
      prisma.creditTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    return ok({
      balance,
      cost: CREDIT_COST,
      packs: activePacks(),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        delta: t.delta,
        balanceAfter: t.balanceAfter,
        note: t.note,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    return fail(err);
  }
}
