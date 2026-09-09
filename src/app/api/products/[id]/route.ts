import { requireUser } from "@/lib/auth";
import { deleteProduct } from "@/lib/products";
import { fail, ok } from "@/lib/http";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const result = await deleteProduct({ userId: user.id, productId: id });

    // Trả cả storageError ra ngoài: dòng đã xoá nên thao tác coi như thành
    // công, nhưng nếu file chưa dọn được thì phải nói, không im lặng.
    return ok({ id, ...result });
  } catch (err) {
    return fail(err);
  }
}
