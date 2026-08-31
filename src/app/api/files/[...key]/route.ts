import { requireUser } from "@/lib/auth";
import { getImage } from "@/lib/storage";
import { fail } from "@/lib/http";
import { AppError } from "@/lib/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string[] }> },
) {
  try {
    const user = await requireUser();
    const { key } = await ctx.params;
    const path = key.join("/");

    // Key luôn bắt đầu bằng userId — chặn người này xem ảnh người kia.
    if (key[0] !== user.id) {
      throw new AppError("FORBIDDEN", "Không có quyền xem file này", 403);
    }

    const { data, mime } = await getImage(path);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return fail(err);
  }
}
