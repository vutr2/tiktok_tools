/**
 * Sinh text bằng DeepSeek V4.
 *
 * Ba thứ Claude cho sẵn mà DeepSeek KHÔNG có, phải bù bằng code:
 *
 *   1. Không có `json_schema` ràng buộc — DeepSeek chỉ có `json_object`. Model
 *      trả JSON hợp lệ nhưng sai hình dạng là chuyện bình thường, nên phải tự
 *      kiểm bằng Zod rồi thử lại.
 *   2. Tài liệu của họ ghi rõ "API may occasionally return empty content".
 *      Nội dung rỗng cũng phải thử lại, không được để nó thành lỗi cho người bán.
 *   3. Không đọc được ảnh — `deepseek-v4-flash` là model TEXT THUẦN. Có ảnh thì
 *      phải chuyển sang biến thể vision, xem `pickModel()`.
 *
 * Prompt hệ thống là hằng số theo ngành, và DeepSeek tự cache prefix (giá cache
 * hit rẻ hơn ~50 lần), nên không cần đánh dấu cache_control như bên Claude.
 */

import { z } from "zod";
import { deepseekCostVnd } from "@/lib/pricing";
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
  LISTING_JSON_SHAPE,
  ScriptsSchema,
  SCRIPTS_JSON_SHAPE,
  type ImageInput,
  type ListingCopy,
  type VideoScript,
} from "./text-core";

const TEXT_MODEL = () => process.env.DEEPSEEK_TEXT_MODEL ?? "deepseek-v4-flash";
const VISION_MODEL = () =>
  process.env.DEEPSEEK_VISION_MODEL ?? "deepseek-v4-flash-vision-exp";

/** Có ảnh thì buộc phải dùng biến thể vision — bản Flash thường mù. */
function pickModel(hasImage: boolean): string {
  return hasImage ? VISION_MODEL() : TEXT_MODEL();
}

function baseUrl(): string {
  return (
    process.env.DEEPSEEK_BASE_URL?.replace(/\/+$/, "") ??
    "https://api.deepseek.com"
  );
}

function apiKey(): string {
  const k = process.env.DEEPSEEK_API_KEY;
  if (!k) {
    throw new ProviderError("deepseek", "Chưa cấu hình DEEPSEEK_API_KEY", false);
  }
  return k;
}

type ChatMessage = {
  role: "system" | "user";
  content: string | ({ type: string } & Record<string, unknown>)[];
};

type ChatResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_cache_hit_tokens?: number;
  };
};

function userMessage(text: string, image?: ImageInput): ChatMessage {
  if (!image) return { role: "user", content: text };
  // Định dạng ảnh theo chuẩn OpenAI-compatible mà DeepSeek dùng.
  return {
    role: "user",
    content: [
      {
        type: "image_url",
        image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
      },
      { type: "text", text },
    ],
  };
}

async function chat(args: {
  model: string;
  system: string;
  user: ChatMessage;
  maxTokens: number;
}): Promise<ChatResponse> {
  // Đọc key TRƯỚC try: thiếu key là lỗi cấu hình (retryable=false), không được
  // để nó rơi vào catch của fetch rồi bị bọc lại thành lỗi mạng có thể thử lại.
  const key = apiKey();

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model,
        messages: [{ role: "system", content: args.system }, args.user],
        response_format: { type: "json_object" },
        max_tokens: args.maxTokens,
        // Sinh nội dung bán hàng cần ổn định hơn là bay bổng.
        temperature: 0.7,
      }),
    });
  } catch (err) {
    throw new ProviderError(
      "deepseek",
      `Không gọi được DeepSeek: ${err instanceof Error ? err.message : String(err)}`,
      true,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw deepseekError(res.status, detail);
  }
  return (await res.json()) as ChatResponse;
}

function deepseekError(status: number, detail: string): ProviderError {
  const short = detail.slice(0, 200);
  if (status === 401) {
    return new ProviderError("deepseek", "DEEPSEEK_API_KEY không hợp lệ.", false);
  }
  if (status === 402) {
    return new ProviderError(
      "deepseek",
      "Tài khoản DeepSeek hết số dư. Nạp thêm rồi thử lại.",
      false,
    );
  }
  if (status === 400) {
    return new ProviderError("deepseek", `Yêu cầu không hợp lệ: ${short}`, false);
  }
  if (status === 429) {
    return new ProviderError("deepseek", "Đang quá tải, thử lại sau ít phút.", true);
  }
  return new ProviderError("deepseek", `Lỗi API (${status}): ${short}`, status >= 500);
}

/**
 * Gọi rồi kiểm schema, sai thì gọi lại.
 *
 * Đây là phần thay thế cho `json_schema` của Claude. Hai lần thử là đủ: lỗi hình
 * dạng thường do một lần sinh xui, còn sai dai dẳng thì là lỗi prompt, retry
 * thêm chỉ tốn tiền của mình.
 */
async function chatJson<T extends z.ZodTypeAny>(args: {
  schema: T;
  model: string;
  system: string;
  user: ChatMessage;
  maxTokens: number;
}): Promise<{ parsed: z.infer<T>; usage: ChatResponse["usage"] }> {
  let lastProblem = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await chat(args);
    const raw = res.choices?.[0]?.message?.content?.trim();

    if (!raw) {
      lastProblem = "nội dung rỗng";
      continue;
    }
    if (res.choices?.[0]?.finish_reason === "length") {
      lastProblem = "JSON bị cắt giữa chừng (chạm max_tokens)";
      continue;
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      lastProblem = "không phải JSON hợp lệ";
      continue;
    }

    const check = args.schema.safeParse(json);
    if (check.success) {
      return { parsed: check.data, usage: res.usage };
    }
    lastProblem = `sai hình dạng: ${check.error.issues[0]?.path.join(".")} ${check.error.issues[0]?.message}`;
  }

  throw new ProviderError(
    "deepseek",
    `Model trả về dữ liệu không dùng được sau 2 lần thử (${lastProblem}).`,
    true,
  );
}

function costOf(model: string, usage: ChatResponse["usage"]): number | null {
  const total = usage?.prompt_tokens ?? 0;
  const cached = usage?.prompt_cache_hit_tokens ?? 0;
  const vnd = deepseekCostVnd(model, {
    inputMiss: Math.max(0, total - cached),
    inputHit: cached,
    output: usage?.completion_tokens ?? 0,
  });
  // null khi chưa có giá niêm yết cho model đó — để null chảy xuống DB thay vì
  // bịa số. `npm run economics` sẽ báo thiếu.
  return vnd === null ? null : Math.round(vnd);
}

// ---------------------------------------------------------------------------

export async function generateListingCopy(args: {
  industry: Industry;
  info: ProductInfo;
  image?: ImageInput;
}): Promise<{ output: ListingCopy; costVnd: number | null }> {
  const model = pickModel(!!args.image);
  const { parsed, usage } = await chatJson({
    schema: ListingSchema,
    model,
    // DeepSeek yêu cầu chữ "json" xuất hiện trong prompt khi bật json_object.
    system: `${buildListingSystem(args.industry)}\n\nTrả lời bằng MỘT object json duy nhất, đúng hình dạng sau, không thêm chữ nào ngoài json:\n${LISTING_JSON_SHAPE}`,
    user: userMessage(
      buildListingUser({ info: args.info, hasImage: !!args.image }),
      args.image,
    ),
    maxTokens: 8_000,
  });

  return {
    output: finalizeListing(parsed, args.industry),
    costVnd: costOf(model, usage),
  };
}

export async function generateVideoScripts(args: {
  industry: Industry;
  info: ProductInfo;
  image?: ImageInput;
}): Promise<{ output: { scripts: VideoScript[] }; costVnd: number | null }> {
  const model = pickModel(!!args.image);
  const { parsed, usage } = await chatJson({
    schema: ScriptsSchema,
    model,
    system: `${buildScriptSystem(args.industry)}\n\nTrả lời bằng MỘT object json duy nhất, đúng hình dạng sau, không thêm chữ nào ngoài json:\n${SCRIPTS_JSON_SHAPE}`,
    user: userMessage(
      buildScriptUser({ info: args.info, hasImage: !!args.image }),
      args.image,
    ),
    maxTokens: 16_000,
  });

  if (parsed.scripts.length === 0) {
    throw new ProviderError("deepseek", "Model không trả về kịch bản nào.", true);
  }

  const pack = getPack(args.industry);
  return {
    output: { scripts: parsed.scripts.slice(0, 5).map((s) => auditScript(s, pack)) },
    costVnd: costOf(model, usage),
  };
}
