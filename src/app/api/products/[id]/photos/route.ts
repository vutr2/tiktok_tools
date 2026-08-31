import { requireUser } from "@/lib/auth";
import { generateProductPhotos } from "@/lib/features";
import { fail, ok } from "@/lib/http";

export const maxDuration = 300;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const result = await generateProductPhotos({
      userId: user.id,
      productId: id,
      sceneIds: Array.isArray(body.sceneIds) ? body.sceneIds : undefined,
    });

    return ok(result);
  } catch (err) {
    return fail(err);
  }
}
