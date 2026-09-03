/**
 * Sinh ảnh: tách nền + ghép bối cảnh.
 *
 * Provider mặc định là Gemini image (tên quen thuộc: "nano banana"). Lý do chọn
 * và bảng so giá các lựa chọn khác: docs/unit-economics.md.
 *
 * Điểm quan trọng về giá: API trả về số token đã dùng trong `usageMetadata`, nên
 * mỗi lần sinh ảnh đều ghi được chi phí thật vào `generations.providerCostVnd`.
 * Không phải đoán, không phải chạy script riêng để đo.
 *
 * Provider `mock` cho phép chạy toàn bộ luồng (trừ credit, hoàn credit, lưu ảnh)
 * mà không cần credential và không tốn tiền.
 */

import { ApiError, GoogleGenAI, type Part } from "@google/genai";
import { ProviderError } from "@/lib/errors";
import {
  imageCost,
  type ImageCostQuote,
  type ImageModelId,
} from "@/lib/pricing";

export type ImageBlob = { data: Buffer; mime: string };

export type ImageResult = ImageBlob & {
  /** Chi phí lần gọi này (VND). null = không tính được. */
  costVnd: number | null;
  /** Nguồn của con số trên — để biết có đang tin vào giá niêm yết hay không. */
  costSource: ImageCostQuote["source"] | null;
  jobId: string | null;
};

export interface ImageProvider {
  readonly name: string;
  removeBackground(input: ImageBlob): Promise<ImageResult>;
  compose(args: {
    subject: ImageBlob;
    prompt: string;
    negative: string;
    aspect: string;
  }): Promise<ImageResult>;
}

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

class MockProvider implements ImageProvider {
  readonly name = "mock";

  async removeBackground(input: ImageBlob): Promise<ImageResult> {
    await delay(200);
    return { ...input, costVnd: 0, costSource: null, jobId: null };
  }

  async compose(args: { subject: ImageBlob }): Promise<ImageResult> {
    await delay(400);
    // Trả lại đúng ảnh gốc: đủ để kiểm luồng credit/lưu file, và không giả vờ
    // rằng đã sinh được ảnh thật.
    return {
      ...args.subject,
      costVnd: 0,
      costSource: null,
      jobId: `mock_${Date.now()}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Gemini image ("nano banana")
// ---------------------------------------------------------------------------

/**
 * Gemini chỉ nhận các tỷ lệ này. "4:5" (chuẩn ảnh dọc quen thuộc) KHÔNG có
 * trong danh sách — phải quy về 3:4, tỷ lệ dọc gần nhất. Gửi thẳng "4:5" sẽ lỗi.
 */
const GEMINI_ASPECT: Record<string, string> = {
  "1:1": "1:1",
  "4:5": "3:4",
  "3:4": "3:4",
  "2:3": "2:3",
  "9:16": "9:16",
  "16:9": "16:9",
  "4:3": "4:3",
  "3:2": "3:2",
  "21:9": "21:9",
};

function toGeminiAspect(aspect: string): string {
  return GEMINI_ASPECT[aspect] ?? "1:1";
}

class GeminiImageProvider implements ImageProvider {
  readonly name = "gemini";

  private model = (process.env.GEMINI_IMAGE_MODEL ??
    "gemini-3.1-flash-image-preview") as ImageModelId;

  private client: GoogleGenAI | null = null;

  private ai(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ProviderError("gemini", "Chưa cấu hình GEMINI_API_KEY.", false);
    }
    this.client ??= new GoogleGenAI({ apiKey });
    return this.client;
  }

  async removeBackground(input: ImageBlob): Promise<ImageResult> {
    return this.run({
      subject: input,
      prompt:
        "Remove the background completely and place the subject on a plain pure white background. " +
        "Keep the subject pixel-identical: do not redraw, recolor, reshape, relight or crop it, " +
        "and do not alter any text, logo or label on it. Clean, precise edges. Output the image only.",
      aspect: "1:1",
    });
  }

  async compose(args: {
    subject: ImageBlob;
    prompt: string;
    negative: string;
    aspect: string;
  }): Promise<ImageResult> {
    return this.run({
      subject: args.subject,
      // Gemini không có tham số negative prompt riêng — phải viết thành câu.
      prompt: `${args.prompt}\n\nAvoid: ${args.negative}.`,
      aspect: args.aspect,
    });
  }

  private async run(args: {
    subject: ImageBlob;
    prompt: string;
    aspect: string;
  }): Promise<ImageResult> {
    let response;
    try {
      response = await this.ai().models.generateContent({
        model: this.model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: args.subject.mime,
                  data: args.subject.data.toString("base64"),
                },
              },
              { text: args.prompt },
            ],
          },
        ],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: toGeminiAspect(args.aspect) },
        },
      });
    } catch (err) {
      throw wrapGeminiError(err);
    }

    const candidate = response.candidates?.[0];
    const parts: Part[] = candidate?.content?.parts ?? [];
    const image = parts.find((p) => p.inlineData?.data);

    if (!image?.inlineData?.data) {
      const finish = String(candidate?.finishReason ?? "KHÔNG_RÕ");
      const said = parts
        .map((p) => p.text)
        .filter(Boolean)
        .join(" ")
        .slice(0, 200);
      // Bị chặn vì nội dung thì retry bao nhiêu lần cũng vậy.
      const blocked = ["SAFETY", "PROHIBITED_CONTENT", "RECITATION", "BLOCKLIST"].includes(
        finish,
      );
      throw new ProviderError(
        "gemini",
        `Không nhận được ảnh (${finish})${said ? `: ${said}` : ""}`,
        !blocked,
      );
    }

    const quote = imageCost({
      model: this.model,
      // Token ảnh nằm trong phần output của response.
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
    });

    return {
      data: Buffer.from(image.inlineData.data, "base64"),
      mime: image.inlineData.mimeType ?? "image/png",
      costVnd: quote.costVnd,
      costSource: quote.source,
      jobId: response.responseId ?? null,
    };
  }
}

function wrapGeminiError(err: unknown): ProviderError {
  if (err instanceof ApiError) {
    const retryable = err.status === 429 || err.status >= 500;
    if (err.status === 401 || err.status === 403) {
      return new ProviderError("gemini", "GEMINI_API_KEY không hợp lệ.", false);
    }
    if (err.status === 429) {
      return new ProviderError("gemini", "Đang quá tải, thử lại sau ít phút.", true);
    }
    return new ProviderError(
      "gemini",
      `Lỗi API (${err.status}): ${err.message}`,
      retryable,
    );
  }
  return new ProviderError(
    "gemini",
    err instanceof Error ? err.message : String(err),
    true,
  );
}

// ---------------------------------------------------------------------------
// Kling (Kuaishou)
// ---------------------------------------------------------------------------

/**
 * Kling khác Gemini ở ba điểm phải xử lý:
 *
 *   1. BẤT ĐỒNG BỘ — POST tạo task, rồi phải hỏi lại tới khi xong.
 *   2. Trả về URL ảnh, không phải base64. Phải tải về mới có Buffer.
 *   3. Không trả token đã dùng, nên KHÔNG suy ra được giá vốn mỗi lần gọi.
 *      Giá chỉ có khi bạn điền IMAGE_COST_VND_PER_SCENE từ hoá đơn thật.
 *      Cố ý để null thay vì bịa số — xem luật ở đầu src/lib/pricing.ts.
 *
 * Cảnh báo về chất lượng: đây là model khuếch tán, nó VẼ LẠI chủ thể. Ảnh sản
 * phẩm sống chết ở chỗ giữ nguyên nhãn mác và chữ trên bao bì. Phải chạy đối
 * chứng với Gemini trên đúng hàng của bạn rồi mới đổi mặc định.
 */

/** Kling không nhận "4:5" — đúng cái bẫy của Gemini. Đã dò trực tiếp trên API. */
const KLING_ASPECT: Record<string, string> = {
  "1:1": "1:1",
  "4:5": "3:4",
  "3:4": "3:4",
  "2:3": "2:3",
  "9:16": "9:16",
  "16:9": "16:9",
  "4:3": "4:3",
};

export function toKlingAspect(aspect: string): string {
  return KLING_ASPECT[aspect] ?? "1:1";
}

type KlingTask = {
  code: number;
  message: string;
  data?: {
    task_id?: string;
    task_status?: string;
    task_status_msg?: string;
    task_result?: { images?: { url?: string }[] };
  };
};

const KLING_POLL_MS = 2_000;
const KLING_TIMEOUT_MS = 180_000;

class KlingImageProvider implements ImageProvider {
  readonly name = "kling";

  private model = process.env.KLING_IMAGE_MODEL ?? "kling-v2-1";

  private base(): string {
    return (
      process.env.KLING_BASE_URL?.replace(/\/+$/, "") ??
      "https://api.klingai.com"
    );
  }

  private key(): string {
    const k = process.env.KLING_API_KEY;
    if (!k) {
      throw new ProviderError("kling", "Chưa cấu hình KLING_API_KEY.", false);
    }
    return k;
  }

  async removeBackground(input: ImageBlob): Promise<ImageResult> {
    return this.run({
      subject: input,
      prompt:
        "The exact same product, unchanged, isolated on a plain pure white studio background. " +
        "Preserve every detail of the product: shape, colour, material, and all text, logos and labels. " +
        "Do not redraw or restyle the product. Clean precise edges.",
      negative:
        "background clutter, props, hands, people, text overlay, watermark, changed label, distorted logo",
      aspect: "1:1",
    });
  }

  async compose(args: {
    subject: ImageBlob;
    prompt: string;
    negative: string;
    aspect: string;
  }): Promise<ImageResult> {
    return this.run(args);
  }

  private async run(args: {
    subject: ImageBlob;
    prompt: string;
    negative: string;
    aspect: string;
  }): Promise<ImageResult> {
    const taskId = await this.createTask(args);
    const url = await this.awaitImage(taskId);
    const blob = await this.download(url);

    // `this.model` không nằm trong IMAGE_MODELS nên imageCost() chỉ trả số khi
    // đã có IMAGE_COST_VND_PER_SCENE từ hoá đơn. Không có thì null, đúng ý đồ.
    const quote = imageCost({ model: this.model, outputTokens: null });

    return {
      ...blob,
      costVnd: quote.costVnd,
      costSource: quote.source,
      jobId: taskId,
    };
  }

  private async createTask(args: {
    subject: ImageBlob;
    prompt: string;
    negative: string;
    aspect: string;
  }): Promise<string> {
    const json = await this.call<KlingTask>("POST", "/v1/images/generations", {
      model_name: this.model,
      prompt: args.prompt,
      negative_prompt: args.negative,
      image: args.subject.data.toString("base64"),
      // "subject" bảo Kling bám lấy chủ thể trong ảnh tham chiếu thay vì chỉ
      // lấy bố cục. Đây là thứ gần nhất với "giữ nguyên sản phẩm".
      image_reference: "subject",
      image_fidelity: 0.9,
      aspect_ratio: toKlingAspect(args.aspect),
      n: 1,
    });

    const id = json.data?.task_id;
    if (!id) {
      throw new ProviderError("kling", `Không tạo được task: ${json.message}`, true);
    }
    return id;
  }

  private async awaitImage(taskId: string): Promise<string> {
    const deadline = Date.now() + KLING_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const json = await this.call<KlingTask>(
        "GET",
        `/v1/images/generations/${taskId}`,
      );
      const status = json.data?.task_status;

      if (status === "succeed") {
        const url = json.data?.task_result?.images?.[0]?.url;
        if (!url) {
          throw new ProviderError("kling", "Task xong nhưng không có ảnh.", true);
        }
        return url;
      }
      if (status === "failed") {
        throw new ProviderError(
          "kling",
          `Sinh ảnh thất bại: ${json.data?.task_status_msg ?? "không rõ lý do"}`,
          true,
        );
      }
      await delay(KLING_POLL_MS);
    }

    throw new ProviderError(
      "kling",
      `Quá ${KLING_TIMEOUT_MS / 1000}s chưa xong. Task ${taskId} vẫn có thể chạy tiếp bên Kling.`,
      true,
    );
  }

  private async download(url: string): Promise<ImageBlob> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new ProviderError("kling", `Tải ảnh về lỗi (${res.status}).`, true);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return { data: buf, mime: res.headers.get("content-type") ?? "image/png" };
  }

  private async call<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base()}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.key()}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new ProviderError(
        "kling",
        `Không gọi được Kling: ${err instanceof Error ? err.message : String(err)}`,
        true,
      );
    }

    const json = (await res.json().catch(() => null)) as
      | (T & { code?: number; message?: string })
      | null;

    if (!res.ok || (json?.code !== undefined && json.code !== 0)) {
      throw klingError(res.status, json?.code, json?.message);
    }
    return json as T;
  }
}

/** Mã lỗi Kling — dò trực tiếp trên API, không đoán từ tài liệu. */
function klingError(
  httpStatus: number,
  code?: number,
  message?: string,
): ProviderError {
  // 1102 = hết số dư. Retry vô nghĩa, và đây là lỗi PHẢI hoàn credit cho người dùng.
  if (code === 1102) {
    return new ProviderError(
      "kling",
      "Tài khoản Kling hết số dư. Nạp thêm ở kling.ai/dev rồi thử lại.",
      false,
    );
  }
  if (code === 1000 || code === 1001 || httpStatus === 401) {
    return new ProviderError("kling", "KLING_API_KEY không hợp lệ.", false);
  }
  if (code === 1201) {
    return new ProviderError("kling", `Tham số sai: ${message}`, false);
  }
  if (httpStatus === 429) {
    return new ProviderError("kling", "Kling đang quá tải, thử lại sau.", true);
  }
  return new ProviderError(
    "kling",
    `Lỗi Kling (${httpStatus}/${code ?? "?"}): ${message ?? "không rõ"}`,
    httpStatus >= 500,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------

export function imageProvider(): ImageProvider {
  const name = (process.env.IMAGE_PROVIDER ?? "mock").toLowerCase();
  switch (name) {
    case "gemini":
      return new GeminiImageProvider();
    case "kling":
      return new KlingImageProvider();
    case "mock":
      return new MockProvider();
    default:
      // Thêm provider mới: implement ImageProvider rồi thêm một case ở đây.
      // Phần còn lại của app không biết provider nào đang chạy.
      throw new ProviderError("image", `IMAGE_PROVIDER không hợp lệ: ${name}`, false);
  }
}

export { toGeminiAspect };
