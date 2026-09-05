/**
 * Ba chức năng của MVP. Không có chức năng thứ tư.
 *
 * 1. generateProductPhotos — ảnh sản phẩm: tách nền + ghép 4 bối cảnh
 * 2. generateListing       — mô tả sàn: tiêu đề + mô tả + hashtag
 * 3. generateScripts       — 5 kịch bản video 30s
 */

import type { Database } from "./database.types";

/** Dòng products từ supabase — ngày là chuỗi ISO. */
type Product = Database["public"]["Tables"]["products"]["Row"];
import { db, unwrapOne } from "./supabase";
import { getEntitlement, requireEntitlement } from "./entitlement";
import { runGeneration } from "./generation";
import { AppError } from "./errors";
import { CREDIT_COST } from "./pricing";
import { getImage, putImage, publicUrl, isAllowedMime } from "./storage";
import { imageProvider } from "./ai/image";
import {
  generateListingCopy,
  generateVideoScripts,
  type ImageInput,
  type ListingCopy,
  type VideoScript,
} from "./ai/text";
import { allScenes, buildPhotoPrompt, getScene } from "@/prompts";
import type { Industry } from "./industries";

async function loadProduct(userId: string, productId: string): Promise<Product> {
  const { data: product } = await db
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("userId", userId)
    .maybeSingle();
  if (!product) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm", 404);
  return product;
}

/** Ảnh cho Claude đọc: ưu tiên ảnh đã tách nền, chưa có thì dùng ảnh gốc. */
async function productImageInput(product: Product): Promise<ImageInput | undefined> {
  const key = product.cutoutImageKey ?? product.originalImageKey;
  try {
    const { data, mime } = await getImage(key);
    if (!isAllowedMime(mime)) return undefined;
    return { base64: data.toString("base64"), mediaType: mime };
  } catch {
    return undefined;
  }
}

function productInfo(product: Product) {
  return {
    name: product.name,
    ...(product.info as Record<string, unknown>),
  };
}

// ---------------------------------------------------------------------------
// 1. Ảnh sản phẩm
// ---------------------------------------------------------------------------

export type PhotoResult = {
  sceneId: string;
  sceneName: string;
  ok: boolean;
  url?: string;
  generationId: string | null;
  error?: string;
};

/**
 * Tách nền một lần rồi cache vào product.cutoutImageKey. Lần sinh ảnh thứ hai
 * cho cùng sản phẩm không gọi lại bước này.
 */
export async function ensureCutout(product: Product): Promise<Product> {
  if (product.cutoutImageKey) return product;

  const provider = imageProvider();
  const original = await getImage(product.originalImageKey);
  const cut = await provider.removeBackground(original);

  const key = await putImage({
    userId: product.userId,
    data: cut.data,
    mime: isAllowedMime(cut.mime) ? cut.mime : "image/png",
    prefix: "cutout",
  });

  return unwrapOne(
    await db
      .from("products")
      .update({ cutoutImageKey: key, updatedAt: new Date().toISOString() })
      .eq("id", product.id)
      .select("*")
      .single(),
    "lưu ảnh tách nền",
  );
}

export async function generateProductPhotos(args: {
  userId: string;
  productId: string;
  sceneIds?: string[];
}): Promise<{ results: PhotoResult[]; creditsCharged: number; balance: number }> {
  let product = await loadProduct(args.userId, args.productId);
  const industry = product.industry as Industry;

  const sceneIds =
    args.sceneIds && args.sceneIds.length > 0
      ? args.sceneIds
      : allScenes(industry).map((s) => s.id);

  // Chặn sớm: phải đủ lượt cho TẤT CẢ bối cảnh đã chọn. Chạy được 2/4 rồi
  // hết lượt là trải nghiệm tệ nhất có thể.
  await requireEntitlement(args.userId, sceneIds.length);

  product = await ensureCutout(product);
  const cutout = await getImage(product.cutoutImageKey!);
  const provider = imageProvider();

  const results: PhotoResult[] = [];
  let creditsCharged = 0;

  for (const sceneId of sceneIds) {
    const scene = getScene(industry, sceneId);
    const spec = buildPhotoPrompt({
      industry,
      sceneId,
      productName: product.name,
    });

    try {
      const run = await runGeneration({
        userId: args.userId,
        productId: product.id,
        type: "PRODUCT_PHOTO",
        industry: product.industry,
        credits: CREDIT_COST.PRODUCT_PHOTO_PER_SCENE,
        provider: provider.name,
        input: { sceneId, prompt: spec.prompt, aspect: spec.aspect },
        run: async () => {
          const image = await provider.compose({
            subject: cutout,
            prompt: spec.prompt,
            negative: spec.negative,
            aspect: spec.aspect,
          });
          const key = await putImage({
            userId: args.userId,
            data: image.data,
            mime: isAllowedMime(image.mime) ? image.mime : "image/png",
            prefix: `scene/${sceneId}`,
          });
          return {
            output: { key, url: publicUrl(key), sceneId },
            providerCostVnd: image.costVnd,
            providerJobId: image.jobId,
          };
        },
      });

      creditsCharged += run.creditsCharged;
      results.push({
        sceneId,
        sceneName: scene.name,
        ok: true,
        url: (run.output as { url: string }).url,
        generationId: run.generationId,
      });
    } catch (err) {
      // Credit của bối cảnh này đã được hoàn trong runGeneration.
      results.push({
        sceneId,
        sceneName: scene.name,
        ok: false,
        generationId: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    results,
    creditsCharged,
    balance: (await getEntitlement(args.userId)).remaining,
  };
}

// ---------------------------------------------------------------------------
// 2. Mô tả sàn
// ---------------------------------------------------------------------------

export async function generateListing(args: {
  userId: string;
  productId: string;
}): Promise<{ output: ListingCopy; generationId: string; balance: number }> {
  const product = await loadProduct(args.userId, args.productId);
  const image = await productImageInput(product);

  const run = await runGeneration<ListingCopy>({
    userId: args.userId,
    productId: product.id,
    type: "LISTING_COPY",
    industry: product.industry,
    credits: CREDIT_COST.LISTING_COPY,
    provider: "claude",
    input: { productId: product.id, info: productInfo(product) },
    run: async () => {
      const { output, costVnd } = await generateListingCopy({
        industry: product.industry as Industry,
        info: productInfo(product),
        image,
      });
      return { output, providerCostVnd: costVnd };
    },
  });

  return {
    output: run.output,
    generationId: run.generationId,
    balance: run.balanceAfter,
  };
}

// ---------------------------------------------------------------------------
// 3. Kịch bản video 30s
// ---------------------------------------------------------------------------

export async function generateScripts(args: {
  userId: string;
  productId: string;
}): Promise<{
  output: { scripts: VideoScript[] };
  generationId: string;
  balance: number;
}> {
  const product = await loadProduct(args.userId, args.productId);
  const image = await productImageInput(product);

  const run = await runGeneration<{ scripts: VideoScript[] }>({
    userId: args.userId,
    productId: product.id,
    type: "VIDEO_SCRIPT",
    industry: product.industry,
    credits: CREDIT_COST.VIDEO_SCRIPT,
    provider: "claude",
    input: { productId: product.id, info: productInfo(product) },
    run: async () => {
      const { output, costVnd } = await generateVideoScripts({
        industry: product.industry as Industry,
        info: productInfo(product),
        image,
      });
      return { output, providerCostVnd: costVnd };
    },
  });

  return {
    output: run.output,
    generationId: run.generationId,
    balance: run.balanceAfter,
  };
}
