/**
 * Phần sinh text KHÔNG phụ thuộc provider: schema, hậu kiểm, kiểu dữ liệu.
 *
 * Tách ra để Claude và DeepSeek dùng chung đúng một bộ ràng buộc. Mọi lời hứa
 * với người bán — cắt đúng 120/255 ký tự, lint cụm từ cấm, kiểm 30 giây — nằm ở
 * đây, nên đổi provider không làm mất bất kỳ chốt chặn nào.
 */

import { z } from "zod";
import {
  MARKETPLACE_RULES,
  normalizeHashtags,
  truncateAtWord,
  validateDescription,
  validateTitle,
  type TitleIssue,
} from "@/lib/marketplace";
import { getPack, lintClaims } from "@/prompts";

export type ImageInput = {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
};

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const ListingSchema = z.object({
  shopeeTitle: z.string().describe("Tiêu đề cho Shopee, tối đa 120 ký tự"),
  tiktokTitle: z.string().describe("Tiêu đề cho TikTok Shop, 25-255 ký tự"),
  description: z.string().describe("Mô tả dùng chung cho cả hai sàn"),
  bulletPoints: z.array(z.string()).describe("3-6 gạch đầu dòng thông số chính"),
  shopeeHashtags: z.array(z.string()),
  tiktokHashtags: z.array(z.string()),
  keywords: z
    .array(z.string())
    .describe("Từ khoá người mua gõ, dùng để chạy quảng cáo"),
});

export const SceneSchema = z.object({
  seconds: z.number().describe("Thời lượng cảnh, tính bằng giây"),
  voiceover: z.string().describe("Lời thoại đọc trong cảnh này"),
  shot: z.string().describe("Gợi ý cảnh quay: góc máy + hành động cụ thể"),
  onScreenText: z.string().describe("Chữ hiện trên màn hình"),
});

export const ScriptSchema = z.object({
  angle: z.string().describe("Góc tiếp cận của kịch bản này, một câu ngắn"),
  objectionHandled: z.string().describe("Phản đối nào của người mua được xử lý"),
  hook: SceneSchema.describe("Cảnh mở đầu, đúng 3 giây"),
  scenes: z.array(SceneSchema).describe("Các cảnh còn lại sau hook"),
  cta: z.string().describe("Lời kêu gọi hành động cuối video"),
});

export const ScriptsSchema = z.object({
  scripts: z.array(ScriptSchema).describe("Đúng 5 kịch bản khác nhau"),
});

export type ListingCopy = z.infer<typeof ListingSchema> & {
  issues: {
    shopeeTitle: TitleIssue[];
    tiktokTitle: TitleIssue[];
    description: TitleIssue[];
    claims: { matched: string; why: string; fix: string }[];
  };
};

export type VideoScript = z.infer<typeof ScriptSchema> & {
  totalSeconds: number;
  warnings: string[];
};

/**
 * Ví dụ JSON dán vào prompt cho provider KHÔNG ràng buộc schema (DeepSeek chỉ có
 * `json_object`, không có `json_schema`). Claude không cần cái này — nó nhận
 * thẳng schema qua `output_config.format`.
 */
export const LISTING_JSON_SHAPE = `{
  "shopeeTitle": "string, tối đa 120 ký tự",
  "tiktokTitle": "string, 25-255 ký tự",
  "description": "string",
  "bulletPoints": ["string", "..."],
  "shopeeHashtags": ["#string", "..."],
  "tiktokHashtags": ["#string", "..."],
  "keywords": ["string", "..."]
}`;

export const SCRIPTS_JSON_SHAPE = `{
  "scripts": [
    {
      "angle": "string",
      "objectionHandled": "string",
      "hook":   { "seconds": 3, "voiceover": "string", "shot": "string", "onScreenText": "string" },
      "scenes": [ { "seconds": 7, "voiceover": "string", "shot": "string", "onScreenText": "string" } ],
      "cta": "string"
    }
  ]
}`;

// ---------------------------------------------------------------------------
// Hậu kiểm — chạy sau mọi provider
// ---------------------------------------------------------------------------

/** Model đếm ký tự không đáng tin — cắt cứng ở tầng code là chốt chặn cuối. */
export function finalizeListing(
  parsed: z.infer<typeof ListingSchema>,
  industry: Parameters<typeof getPack>[0],
): ListingCopy {
  const pack = getPack(industry);

  const shopeeTitle = truncateAtWord(
    parsed.shopeeTitle.trim(),
    MARKETPLACE_RULES.SHOPEE.titleMax,
  );
  const tiktokTitle = truncateAtWord(
    parsed.tiktokTitle.trim(),
    MARKETPLACE_RULES.TIKTOK_SHOP.titleMax,
  );
  const description = truncateAtWord(
    parsed.description.trim(),
    MARKETPLACE_RULES.SHOPEE.descMax,
  );

  return {
    shopeeTitle,
    tiktokTitle,
    description,
    bulletPoints: parsed.bulletPoints.map((b) => b.trim()).filter(Boolean),
    shopeeHashtags: normalizeHashtags(
      parsed.shopeeHashtags,
      MARKETPLACE_RULES.SHOPEE.hashtagCount,
    ),
    tiktokHashtags: normalizeHashtags(
      parsed.tiktokHashtags,
      MARKETPLACE_RULES.TIKTOK_SHOP.hashtagCount,
    ),
    keywords: parsed.keywords.map((k) => k.trim()).filter(Boolean),
    issues: {
      shopeeTitle: validateTitle(shopeeTitle, "SHOPEE"),
      tiktokTitle: validateTitle(tiktokTitle, "TIKTOK_SHOP"),
      description: validateDescription(description, "SHOPEE"),
      claims: lintClaims(
        [shopeeTitle, tiktokTitle, description, ...parsed.bulletPoints].join("\n"),
        pack,
      ),
    },
  };
}

/** Ràng buộc 30 giây / hook 3 giây do code kiểm, không tin model tự đếm. */
export function auditScript(
  script: z.infer<typeof ScriptSchema>,
  pack: ReturnType<typeof getPack>,
): VideoScript {
  const warnings: string[] = [];
  const totalSeconds =
    script.hook.seconds + script.scenes.reduce((sum, s) => sum + s.seconds, 0);

  if (Math.abs(totalSeconds - 30) > 2) {
    warnings.push(`Tổng thời lượng ${totalSeconds}s, lệch so với 30s.`);
  }
  if (Math.abs(script.hook.seconds - 3) > 0.5) {
    warnings.push(`Hook dài ${script.hook.seconds}s, phải là 3s.`);
  }

  // ~2.5 chữ/giây khi nói nhanh trong video ngắn.
  for (const [i, scene] of [script.hook, ...script.scenes].entries()) {
    const words = scene.voiceover.trim().split(/\s+/).filter(Boolean).length;
    const max = Math.ceil(scene.seconds * 2.5) + 2;
    if (words > max) {
      warnings.push(
        `Cảnh ${i + 1}: ${words} chữ trong ${scene.seconds}s — đọc không kịp (tối đa ~${max}).`,
      );
    }
  }

  const claims = lintClaims(
    [
      script.hook.voiceover,
      script.hook.onScreenText,
      ...script.scenes.flatMap((s) => [s.voiceover, s.onScreenText]),
      script.cta,
    ].join("\n"),
    pack,
  );
  for (const c of claims) warnings.push(`Cụm rủi ro "${c.matched}": ${c.fix}`);

  return { ...script, totalSeconds, warnings };
}
