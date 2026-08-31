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

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------

export function imageProvider(): ImageProvider {
  const name = (process.env.IMAGE_PROVIDER ?? "mock").toLowerCase();
  switch (name) {
    case "gemini":
      return new GeminiImageProvider();
    case "mock":
      return new MockProvider();
    default:
      // Thêm provider mới: implement ImageProvider rồi thêm một case ở đây.
      // Phần còn lại của app không biết provider nào đang chạy.
      throw new ProviderError("image", `IMAGE_PROVIDER không hợp lệ: ${name}`, false);
  }
}

export { toGeminiAspect };
