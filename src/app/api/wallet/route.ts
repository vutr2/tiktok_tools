import { requireUser } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlement";
import { LIFETIME_PLAN, lifetimePriceVnd } from "@/lib/pricing";
import { fail, ok } from "@/lib/http";

/**
 * Trạng thái quyền dùng.
 *
 * Không còn credit, không còn sổ cái — chỉ có: đã mua gói chưa, và còn bao
 * nhiêu lượt dùng thử.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const e = await getEntitlement(user.id);

    return ok({
      plan: user.plan,
      unlimited: e.unlimited,
      usedToday: e.usedToday,
      perDay: e.perDay,
      remaining: e.unlimited ? null : e.remaining,
      daysLeft: e.unlimited ? null : e.daysLeft,
      expired: e.expired,
      lifetime: {
        id: LIFETIME_PLAN.id,
        name: LIFETIME_PLAN.name,
        priceUsd: LIFETIME_PLAN.priceUsd,
        priceVnd: lifetimePriceVnd(),
      },
    });
  } catch (err) {
    return fail(err);
  }
}
