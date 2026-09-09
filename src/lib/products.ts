import { db } from "./supabase";
import { AppError } from "./errors";
import { removeImages } from "./storage";

/**
 * Xoá sản phẩm và dọn ảnh của nó.
 *
 * Ba điều quyết định thứ tự các bước dưới đây:
 *
 * 1. `generations.productId` là ON DELETE SET NULL. Lịch sử sinh ảnh KHÔNG bị
 *    xoá theo — cố ý như vậy: `entitlement.ts` đếm số dòng generations
 *    SUCCEEDED trong ngày để tính lượt dùng thử. Nếu xoá theo, người dùng chỉ
 *    cần xoá sản phẩm là được thêm lượt miễn phí. Đây là ràng buộc chống lạm
 *    dụng, đừng đổi thành CASCADE.
 *
 * 2. Nhưng SET NULL cũng có nghĩa là xoá xong thì mất luôn đường lần ra ảnh
 *    bối cảnh — key của chúng nằm trong `generations.output.key`. Nên phải
 *    GOM KEY TRƯỚC khi xoá dòng products.
 *
 * 3. Xoá dòng database TRƯỚC, xoá file SAU. Ngược lại, nếu xoá file xong mà
 *    xoá dòng hỏng thì còn lại một sản phẩm trỏ vào ảnh không tồn tại — hỏng
 *    hẳn. Theo thứ tự này, tệ nhất chỉ là vài file mồ côi, và hàm vẫn báo ra.
 */
export async function deleteProduct(args: {
  userId: string;
  productId: string;
}): Promise<{ removedFiles: number; storageError: string | null }> {
  // Lọc theo cả userId: vừa là kiểm tra quyền sở hữu, vừa khiến id của người
  // khác trả về 404 thay vì lộ ra rằng id đó có tồn tại.
  const { data: product } = await db
    .from("products")
    .select("id, originalImageKey, cutoutImageKey")
    .eq("id", args.productId)
    .eq("userId", args.userId)
    .maybeSingle();

  if (!product) {
    throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm", 404);
  }

  const keys = new Set<string>([product.originalImageKey]);
  if (product.cutoutImageKey) keys.add(product.cutoutImageKey);

  // Ảnh bối cảnh: key nằm trong output của từng lần sinh ảnh.
  const { data: photos } = await db
    .from("generations")
    .select("output")
    .eq("productId", args.productId)
    .eq("userId", args.userId)
    .eq("type", "PRODUCT_PHOTO")
    .eq("status", "SUCCEEDED");

  for (const row of photos ?? []) {
    const key = (row.output as { key?: unknown } | null)?.key;
    if (typeof key === "string" && key.length > 0) keys.add(key);
  }

  const { error } = await db
    .from("products")
    .delete()
    .eq("id", args.productId)
    .eq("userId", args.userId);

  if (error) throw new Error(`Không xoá được sản phẩm: ${error.message}`);

  const result = await removeImages([...keys]);
  return { removedFiles: result.removed, storageError: result.error };
}
