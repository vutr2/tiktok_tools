/**
 * Sinh ảnh: tách nền + ghép bối cảnh.
 *
 * ⚠️ TRƯỚC KHI BẬT PROVIDER THẬT
 * Đường dẫn endpoint và tên field của Higgsfield để trong env chứ không hardcode,
 * vì phải mở tài liệu của họ đối chiếu lại trước khi chạy thật. Adapter dưới đây
 * theo mẫu submit-job rồi poll — mẫu phổ biến nhất cho API sinh ảnh, nhưng vẫn
 * phải xác nhận. Xem docs/unit-economics.md.
 *
 * Provider `mock` cho phép chạy toàn bộ luồng (trừ credit, hoàn credit, lưu ảnh)
 * mà không cần credential và không tốn tiền.
 */

import { ProviderError } from "@/lib/errors";
import { measuredBgRemovalCostVnd, measuredImageCostVnd } from "@/lib/pricing";

export type ImageBlob = { data: Buffer; mime: string };

export type ImageResult = ImageBlob & {
  /** Chi phí THẬT provider tính cho lần gọi này (VND). null = provider không trả về. */
  costVnd: number | null;
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
    return { ...input, costVnd: 0, jobId: null };
  }

  async compose(args: {
    subject: ImageBlob;
    prompt: string;
    negative: string;
    aspect: string;
  }): Promise<ImageResult> {
    await delay(400);
    // Trả lại đúng ảnh gốc: đủ để kiểm luồng credit/lưu file, và không giả vờ
    // rằng đã sinh được ảnh thật.
    return { ...args.subject, costVnd: 0, jobId: `mock_${Date.now()}` };
  }
}

// ---------------------------------------------------------------------------
// Higgsfield
// ---------------------------------------------------------------------------

class HiggsfieldProvider implements ImageProvider {
  readonly name = "higgsfield";

  private base = process.env.HIGGSFIELD_API_BASE ?? "";
  private key = process.env.HIGGSFIELD_API_KEY ?? "";

  private ensureConfigured() {
    if (!this.key || !this.base) {
      throw new ProviderError(
        "higgsfield",
        "Chưa cấu hình HIGGSFIELD_API_KEY / HIGGSFIELD_API_BASE.",
        false,
      );
    }
  }

  private async post(path: string, body: unknown): Promise<any> {
    const res = await fetch(`${this.base}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ProviderError(
        "higgsfield",
        `HTTP ${res.status}: ${text.slice(0, 300)}`,
        res.status >= 500 || res.status === 429,
      );
    }
    return res.json();
  }

  async removeBackground(input: ImageBlob): Promise<ImageResult> {
    this.ensureConfigured();
    const path = process.env.HIGGSFIELD_REMOVE_BG_PATH ?? "/image/remove-background";
    const json = await this.post(path, {
      image: `data:${input.mime};base64,${input.data.toString("base64")}`,
    });
    const out = await this.resolve(json);
    return {
      ...out,
      costVnd: out.costVnd ?? measuredBgRemovalCostVnd(),
    };
  }

  async compose(args: {
    subject: ImageBlob;
    prompt: string;
    negative: string;
    aspect: string;
  }): Promise<ImageResult> {
    this.ensureConfigured();
    const path = process.env.HIGGSFIELD_GENERATE_PATH ?? "/image/generate";
    const json = await this.post(path, {
      prompt: args.prompt,
      negative_prompt: args.negative,
      aspect_ratio: args.aspect,
      image: `data:${args.subject.mime};base64,${args.subject.data.toString("base64")}`,
    });
    const out = await this.resolve(json);
    return {
      ...out,
      costVnd: out.costVnd ?? measuredImageCostVnd(),
    };
  }

  /**
   * Nhận kết quả từ response. Hai dạng: trả ảnh ngay, hoặc trả job id rồi phải
   * poll. Xử lý cả hai vì không giả định trước dạng nào.
   */
  private async resolve(json: any): Promise<ImageResult> {
    const direct = pickUrl(json);
    if (direct) {
      return {
        ...(await download(direct)),
        costVnd: pickCost(json),
        jobId: json.id ?? null,
      };
    }

    const jobId = json.id ?? json.job_id;
    if (!jobId) {
      throw new ProviderError(
        "higgsfield",
        "Response không có ảnh lẫn job id — kiểm tra lại shape API.",
        false,
      );
    }

    const jobPath = process.env.HIGGSFIELD_JOB_PATH ?? "/jobs";
    for (let attempt = 0; attempt < 60; attempt++) {
      await delay(2000);
      const res = await fetch(`${this.base}${jobPath}/${jobId}`, {
        headers: { Authorization: `Bearer ${this.key}` },
      });
      if (!res.ok) continue;
      const job = await res.json();
      const status = String(job.status ?? "").toLowerCase();

      if (["failed", "error", "cancelled"].includes(status)) {
        throw new ProviderError(
          "higgsfield",
          `Job ${jobId} lỗi: ${job.error ?? status}`,
          true,
        );
      }

      const url = pickUrl(job);
      if (url) {
        return { ...(await download(url)), costVnd: pickCost(job), jobId };
      }
    }

    throw new ProviderError("higgsfield", `Job ${jobId} quá 2 phút chưa xong.`, true);
  }
}

function pickUrl(json: any): string | null {
  return (
    json?.url ??
    json?.image_url ??
    json?.output?.url ??
    json?.result?.url ??
    (Array.isArray(json?.images) ? json.images[0]?.url ?? json.images[0] : null) ??
    null
  );
}

function pickCost(json: any): number | null {
  const usd = json?.cost_usd ?? json?.cost ?? json?.usage?.cost_usd;
  if (typeof usd === "number" && usd > 0) {
    return Math.round(usd * Number(process.env.USD_VND ?? 26_300));
  }
  return null;
}

async function download(url: string): Promise<ImageBlob> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new ProviderError("higgsfield", `Tải ảnh về lỗi: HTTP ${res.status}`, true);
  }
  const mime = res.headers.get("content-type") ?? "image/png";
  return { data: Buffer.from(await res.arrayBuffer()), mime };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------

export function imageProvider(): ImageProvider {
  const name = (process.env.IMAGE_PROVIDER ?? "mock").toLowerCase();
  switch (name) {
    case "higgsfield":
      return new HiggsfieldProvider();
    case "mock":
      return new MockProvider();
    default:
      throw new ProviderError("image", `IMAGE_PROVIDER không hợp lệ: ${name}`, false);
  }
}
