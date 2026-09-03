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
  buildListingSystem,
  buildListingUser,
  buildScriptSystem,
  buildScriptUser,
  getPack,
  type ProductInfo,
} from "@/prompts";
import {
  auditScript,
  finalizeListing,
  ListingSchema,
  ScriptsSchema,
  type ImageInput,
  type ListingCopy,
  type VideoScript,
} from "./text-core";

export { auditScript };
export type { ImageInput, ListingCopy, VideoScript };

export const MODEL: ClaudeModelId = "claude-opus-5";

let cached: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ProviderError("claude", "Chưa cấu hình ANTHROPIC_API_KEY", false);
  }
  cached ??= new Anthropic();
  return cached;
}

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

export async function generateListingCopy(args: {
  industry: Industry;
  info: ProductInfo;
  image?: ImageInput;
}): Promise<{ output: ListingCopy; costVnd: number }> {
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

  return {
    output: finalizeListing(parsed, args.industry),
    costVnd: usageCostVnd(response.usage),
  };
}

// ---------------------------------------------------------------------------
// Kịch bản video 30 giây
// ---------------------------------------------------------------------------

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
