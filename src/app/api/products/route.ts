import { requireUser } from "@/lib/auth";
import { db, unwrapOne } from "@/lib/supabase";
import { newId } from "@/lib/ids";
import { fail, ok } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { isIndustry } from "@/lib/industries";
import {
  MAX_UPLOAD_BYTES,
  isAllowedMime,
  putImage,
  signedUrl,
  signedUrls,
} from "@/lib/storage";

export async function GET() {
  try {
    const user = await requireUser();
    const products =
      (
        await db
          .from("products")
          .select("*")
          .eq("userId", user.id)
          .order("createdAt", { ascending: false })
          .limit(50)
      ).data ?? [];
      // Ký một lần cho cả danh sách thay vì await bên trong map.
      const urls = await signedUrls(
        products.map((p) => p.cutoutImageKey ?? p.originalImageKey),
      );

      return ok(
        products.map((p) => {
          const key = p.cutoutImageKey ?? p.originalImageKey;
          return {
            id: p.id,
            name: p.name,
            industry: p.industry,
            imageUrl: urls.get(key) ?? null,
            createdAt: p.createdAt,
          };
        }),
      );
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const form = await req.formData();

    const name = String(form.get("name") ?? "").trim();
    if (!name) throw new AppError("NAME_REQUIRED", "Thiếu tên sản phẩm");

    const industry = String(form.get("industry") ?? user.industry ?? "");
    if (!isIndustry(industry)) {
      throw new AppError("INDUSTRY_REQUIRED", "Phải chọn ngành hàng");
    }

    const file = form.get("image");
    if (!(file instanceof File)) {
      throw new AppError("IMAGE_REQUIRED", "Thiếu ảnh sản phẩm");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new AppError("IMAGE_TOO_LARGE", "Ảnh quá 12MB, chụp lại hoặc nén bớt");
    }
    if (!isAllowedMime(file.type)) {
      throw new AppError("IMAGE_TYPE", "Chỉ nhận JPG, PNG hoặc WEBP");
    }

    const infoRaw = String(form.get("info") ?? "{}");
    let info: Record<string, unknown>;
    try {
      info = JSON.parse(infoRaw);
    } catch {
      throw new AppError("INFO_INVALID", "Thông tin sản phẩm không hợp lệ");
    }

    const key = await putImage({
      userId: user.id,
      data: Buffer.from(await file.arrayBuffer()),
      mime: file.type,
      prefix: "raw",
    });

    const product: { id: string } = unwrapOne(
      await db
        .from("products")
        .insert({
          id: newId(),
          userId: user.id,
          industry,
          name,
          originalImageKey: key,
          info: info as never,
          updatedAt: new Date().toISOString(),
        })
        .select("id")
        .single(),
      "tạo sản phẩm",
    );

    return ok({ id: product.id, imageUrl: await signedUrl(key) }, 201);
  } catch (err) {
    return fail(err);
  }
}
