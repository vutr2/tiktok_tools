/**
 * Sinh text: tiêu đề/mô tả/hashtag và kịch bản video.
 *
 * Prompt hệ thống là hằng số theo ngành nên đặt cache_control lên nó — mọi người
 * bán cùng ngành dùng chung một prefix, tiết kiệm đáng kể input token.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { claudeCostVnd, type ClaudeModelId } from "@/lib/pricing";
import { ProviderError } from "@/lib/errors";
import type { Industry } from "@/lib/industries";
import {
  MARKETPLACE_RULES,
  normalizeHashtags,
  truncateAtWord,
  validateDescription,
  validateTitle,
  type TitleIssue,
} from "@/lib/marketplace";
import {
  buildListingSystem,
  buildListingUser,
  buildScriptSystem,
  buildScriptUser,
  getPack,
  lintClaims,
  type ProductInfo,
} from "@/prompts";

export const MODEL: ClaudeModelId = "claude-opus-5";

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ProviderError("claude", "Chưa cấu hình ANTHROPIC_API_KEY", false);
  }
  cached ??= new Anthropic();
  return cached;
}

export type ImageInput = { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

function userContent(text: string, image?: ImageInput): Anthropic.MessageParam[] {
  if (!image) return [{ role: "user", content: text }];
  return [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: image.mediaType,
            data: image.base64,
          },
        },
        { type: "text", text },
      ],
    },
  ];
}

function wrapError(err: unknown): never {
  if (err instanceof Anthropic.RateLimitError) {
    throw new ProviderError("claude", "Đang quá tải, thử lại sau ít phút.", true);
  }
  if (err instanceof Anthropic.AuthenticationError) {
    throw new ProviderError("claude", "API key không hợp lệ.", false);
  }
  if (err instanceof Anthropic.BadRequestError) {
    throw new ProviderError("claude", `Yêu cầu không hợp lệ: ${err.message}`, false);
  }
  if (err instanceof Anthropic.APIError) {
    throw new ProviderError("claude", `Lỗi API (${err.status}): ${err.message}`, true);
  }
  throw new ProviderError(
    "claude",
    err instanceof Error ? err.message : String(err),
    true,
  );
}

// ---------------------------------------------------------------------------
// Mô tả sàn
// ---------------------------------------------------------------------------

const ListingSchema = z.object({
  shopeeTitle: z.string().describe("Tiêu đề cho Shopee, tối đa 120 ký tự"),
  tiktokTitle: z.string().describe("Tiêu đề cho TikTok Shop, 25-255 ký tự"),
  description: z.string().describe("Mô tả dùng chung cho cả hai sàn"),
  bulletPoints: z.array(z.string()).describe("3-6 gạch đầu dòng thông số chính"),
  shopeeHashtags: z.array(z.string()),
  tiktokHashtags: z.array(z.string()),
  keywords: z.array(z.string()).describe("Từ khoá người mua gõ, dùng để chạy quảng cáo"),
});

export type ListingCopy = z.infer<typeof ListingSchema> & {
  issues: {
    shopeeTitle: TitleIssue[];
    tiktokTitle: TitleIssue[];
    description: TitleIssue[];
    claims: { matched: string; why: string; fix: string }[];
  };
};

export async function generateListingCopy(args: {
  industry: Industry;
  info: ProductInfo;
  image?: ImageInput;
}): Promise<{ output: ListingCopy; costVnd: number }> {
  const pack = getPack(args.industry);
  let response;
  try {
    response = await client().messages.parse({
      model: MODEL,
      max_tokens: 8_000,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: buildListingSystem(args.industry),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: userContent(
        buildListingUser({ info: args.info, hasImage: !!args.image }),
        args.image,
      ),
      output_config: {
        effort: "medium",
        format: zodOutputFormat(ListingSchema),
      },
    });
  } catch (err) {
    wrapError(err);
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new ProviderError("claude", "Model trả về dữ liệu không đọc được.", true);
  }

  // Model đếm ký tự không đáng tin — cắt cứng ở tầng code là chốt chặn cuối.
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

  const output: ListingCopy = {
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

  return { output, costVnd: usageCostVnd(response.usage) };
}

// ---------------------------------------------------------------------------
// Kịch bản video 30 giây
// ---------------------------------------------------------------------------

const SceneSchema = z.object({
  seconds: z.number().describe("Thời lượng cảnh, tính bằng giây"),
  voiceover: z.string().describe("Lời thoại đọc trong cảnh này"),
  shot: z.string().describe("Gợi ý cảnh quay: góc máy + hành động cụ thể"),
  onScreenText: z.string().describe("Chữ hiện trên màn hình"),
});

const ScriptSchema = z.object({
  angle: z.string().describe("Góc tiếp cận của kịch bản này, một câu ngắn"),
  objectionHandled: z.string().describe("Phản đối nào của người mua được xử lý"),
  hook: SceneSchema.describe("Cảnh mở đầu, đúng 3 giây"),
  scenes: z.array(SceneSchema).describe("Các cảnh còn lại sau hook"),
  cta: z.string().describe("Lời kêu gọi hành động cuối video"),
});

const ScriptsSchema = z.object({
  scripts: z.array(ScriptSchema).describe("Đúng 5 kịch bản khác nhau"),
});

export type VideoScript = z.infer<typeof ScriptSchema> & {
  totalSeconds: number;
  warnings: string[];
};

export async function generateVideoScripts(args: {
  industry: Industry;
  info: ProductInfo;
  image?: ImageInput;
}): Promise<{ output: { scripts: VideoScript[] }; costVnd: number }> {
  const pack = getPack(args.industry);
  let response;
  try {
    response = await client().messages.parse({
      model: MODEL,
      max_tokens: 16_000,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: buildScriptSystem(args.industry),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: userContent(
        buildScriptUser({ info: args.info, hasImage: !!args.image }),
        args.image,
      ),
      output_config: {
        effort: "high",
        format: zodOutputFormat(ScriptsSchema),
      },
    });
  } catch (err) {
    wrapError(err);
  }

  const parsed = response.parsed_output;
  if (!parsed || parsed.scripts.length === 0) {
    throw new ProviderError("claude", "Model không trả về kịch bản nào.", true);
  }

  const scripts = parsed.scripts.slice(0, 5).map((s) => auditScript(s, pack));
  return { output: { scripts }, costVnd: usageCostVnd(response.usage) };
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

function usageCostVnd(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): number {
  // Ước tính đơn giản: token đọc từ cache tính như input thường. Sai lệch nhỏ và
  // luôn theo hướng thận trọng (tính đắt hơn thực tế).
  const input =
    usage.input_tokens +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0);
  return Math.round(claudeCostVnd(MODEL, input, usage.output_tokens));
}
