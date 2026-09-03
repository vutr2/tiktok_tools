/**
 * Chọn provider sinh text.
 *
 * Cùng khuôn với `imageProvider()` bên ảnh: phần còn lại của app không biết
 * model nào đang chạy, chỉ gọi hai hàm này. Đổi provider = đổi một biến môi
 * trường, không đụng vào features.ts.
 *
 * Hậu kiểm (cắt ký tự, lint cụm cấm, kiểm 30 giây) nằm ở `text-core.ts` và chạy
 * cho MỌI provider — đổi model không làm mất chốt chặn nào.
 */

import { ProviderError } from "@/lib/errors";
import type { Industry } from "@/lib/industries";
import type { ProductInfo } from "@/prompts";
import * as claude from "./claude";
import * as deepseek from "./deepseek";
import type { ImageInput, ListingCopy, VideoScript } from "./text-core";

export type { ImageInput, ListingCopy, VideoScript };

export type TextArgs = {
  industry: Industry;
  info: ProductInfo;
  image?: ImageInput;
};

/**
 * `costVnd` là `number | null`: Claude luôn tính được từ token, còn DeepSeek trả
 * null khi model chưa có giá niêm yết đối soát được (biến thể vision). Để null
 * chảy xuống DB thay vì bịa số.
 */
export type TextProvider = {
  readonly name: string;
  generateListingCopy(
    args: TextArgs,
  ): Promise<{ output: ListingCopy; costVnd: number | null }>;
  generateVideoScripts(
    args: TextArgs,
  ): Promise<{ output: { scripts: VideoScript[] }; costVnd: number | null }>;
};

export function textProvider(): TextProvider {
  const name = (process.env.TEXT_PROVIDER ?? "claude").toLowerCase();
  switch (name) {
    case "claude":
      return { name: "claude", ...claude };
    case "deepseek":
      return { name: "deepseek", ...deepseek };
    default:
      // Thêm provider mới: implement TextProvider rồi thêm một case ở đây.
      throw new ProviderError("text", `TEXT_PROVIDER không hợp lệ: ${name}`, false);
  }
}

export function generateListingCopy(args: TextArgs) {
  return textProvider().generateListingCopy(args);
}

export function generateVideoScripts(args: TextArgs) {
  return textProvider().generateVideoScripts(args);
}
