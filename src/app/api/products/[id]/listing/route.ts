import { requireUser } from "@/lib/auth";
import { generateListing } from "@/lib/features";
import { fail, ok } from "@/lib/http";

export const maxDuration = 120;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    return ok(await generateListing({ userId: user.id, productId: id }));
  } catch (err) {
    return fail(err);
  }
}
