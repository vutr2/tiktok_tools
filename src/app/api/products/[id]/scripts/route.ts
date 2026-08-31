import { requireUser } from "@/lib/auth";
import { generateScripts } from "@/lib/features";
import { fail, ok } from "@/lib/http";

export const maxDuration = 300;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    return ok(await generateScripts({ userId: user.id, productId: id }));
  } catch (err) {
    return fail(err);
  }
}
