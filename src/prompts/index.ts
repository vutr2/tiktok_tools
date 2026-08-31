/**
 * Registry prompt theo ngành hàng.
 *
 * Đây là điểm khác biệt duy nhất đáng đầu tư. Đối thủ nhét một prompt chung cho
 * mọi ngành; ở đây mỗi ngành có giọng bán, nỗi lo người mua, cụm từ bị cấm,
 * mẫu hook và bối cảnh ảnh riêng.
 *
 * Thêm ngành mới = thêm một file pack + một dòng ở REGISTRY. Không sửa chỗ nào khác.
 */

import type { Industry } from "@/lib/industries";
import { INDUSTRY_LABEL } from "@/lib/industries";
import { MARKETPLACE_RULES, type Marketplace } from "@/lib/marketplace";
import type { PhotoScene, PromptPack } from "./types";
import { MY_PHAM } from "./my-pham";
import { THOI_TRANG } from "./thoi-trang";
import { GIA_DUNG } from "./gia-dung";
import { ME_VA_BE } from "./me-va-be";
import { PHU_KIEN } from "./phu-kien";

export * from "./types";

const REGISTRY: Record<Industry, PromptPack> = {
  MY_PHAM,
  THOI_TRANG,
  GIA_DUNG,
  ME_VA_BE,
  PHU_KIEN,
};

export function getPack(industry: Industry): PromptPack {
  return REGISTRY[industry];
}

export function getScene(industry: Industry, sceneId: string): PhotoScene {
  const scene = getPack(industry).scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`Không có bối cảnh ${sceneId} cho ${industry}`);
  return scene;
}

export function allScenes(industry: Industry): PhotoScene[] {
  return [...getPack(industry).scenes];
}

export type ProductInfo = {
  name: string;
  price?: number | string;
  target?: string;
  usp?: string;
  [key: string]: unknown;
};

function infoLines(info: ProductInfo): string {
  return Object.entries(info)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `- ${k}: ${String(v).trim()}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// 1. Ảnh sản phẩm
// ---------------------------------------------------------------------------

export function buildPhotoPrompt(args: {
  industry: Industry;
  sceneId: string;
  productName: string;
}): { prompt: string; negative: string; aspect: PhotoScene["aspect"] } {
  const scene = getScene(args.industry, args.sceneId);
  return {
    // Ảnh đầu vào đã tách nền; model chỉ dựng bối cảnh quanh nó, không vẽ lại
    // sản phẩm — dòng cuối là ràng buộc quan trọng nhất của cả prompt.
    prompt: [
      scene.prompt,
      `The subject is a ${args.productName}.`,
      "Keep the subject exactly as provided: do not redraw, restyle, recolor or reshape it, do not alter any text, logo or label on it. Only build the described environment and lighting around it.",
    ].join(" "),
    negative: scene.negative,
    aspect: scene.aspect,
  };
}

// ---------------------------------------------------------------------------
// 2. Mô tả sàn
// ---------------------------------------------------------------------------

export function buildListingSystem(industry: Industry): string {
  const pack = getPack(industry);
  const shopee = MARKETPLACE_RULES.SHOPEE;
  const tiktok = MARKETPLACE_RULES.TIKTOK_SHOP;

  return `Bạn viết nội dung bán hàng cho người bán ${INDUSTRY_LABEL[industry]} trên Shopee và TikTok Shop tại Việt Nam.

GIỌNG VIẾT CỦA NGÀNH
${pack.voice}

NGƯỜI MUA NGÀNH NÀY THẬT SỰ QUAN TÂM
${pack.buyerCares.map((c) => `- ${c}`).join("\n")}

CÁCH HỌ GÕ TÌM KIẾM (quyết định cấu trúc tiêu đề)
${pack.searchPatterns.map((p) => `- ${p}`).join("\n")}

RÀNG BUỘC BẮT BUỘC
${pack.compliance.map((c) => `- ${c}`).join("\n")}

TUYỆT ĐỐI KHÔNG DÙNG
${pack.bannedClaims.map((b) => `- ${b.why} → ${b.fix}`).join("\n")}

GIỚI HẠN KÝ TỰ (đếm chính xác, không được vượt)
- Tiêu đề Shopee: ${shopee.titleMin}-${shopee.titleMax} ký tự
- Tiêu đề TikTok Shop: ${tiktok.titleMin}-${tiktok.titleMax} ký tự
- Mô tả: ${shopee.descMin}-${shopee.descMax} ký tự, dùng chung được cho cả hai sàn

QUY TẮC VIẾT
- Tiếng Việt, không dấu chấm than liên tiếp, không viết hoa cả cụm.
- Tiêu đề nhồi từ khoá theo đúng cách người mua gõ, nhưng không lặp một từ quá 2 lần.
- Mô tả chia đoạn ngắn, mỗi đoạn tối đa 3 dòng, có gạch đầu dòng thông số.
- Mọi tính từ phải đi kèm con số hoặc dẫn chứng. "Chất lượng cao" là câu vô nghĩa.
- Không bịa thông số. Thiếu thông tin thì bỏ qua, không đoán.
- Hashtag: không dấu, viết liền, chữ thường.`;
}

export function buildListingUser(args: {
  info: ProductInfo;
  hasImage: boolean;
}): string {
  return `${args.hasImage ? "Ảnh sản phẩm ở trên. Đọc ảnh để lấy chi tiết mà người bán quên ghi (màu, kiểu dáng, chất liệu nhìn thấy được).\n\n" : ""}THÔNG TIN NGƯỜI BÁN CUNG CẤP
${infoLines(args.info)}

Viết cho tôi: tiêu đề Shopee, tiêu đề TikTok Shop, một mô tả dùng chung, và hashtag cho từng sàn.`;
}

// ---------------------------------------------------------------------------
// 3. Kịch bản video 30 giây
// ---------------------------------------------------------------------------

export function buildScriptSystem(industry: Industry): string {
  const pack = getPack(industry);

  return `Bạn viết kịch bản video ngắn 30 giây để bán ${INDUSTRY_LABEL[industry]} trên TikTok Shop Việt Nam.

GIỌNG CỦA NGÀNH
${pack.voice}

PHẢN ĐỐI THƯỜNG GẶP — mỗi kịch bản phải đập được ít nhất một cái
${pack.objections.map((o) => `- ${o}`).join("\n")}

MẪU HOOK 3 GIÂY RIÊNG CỦA NGÀNH — mỗi kịch bản dùng một mẫu khác nhau
${pack.hookPatterns.map((h) => `- ${h}`).join("\n")}

TỪ VỰNG CẢNH QUAY CỦA NGÀNH — gợi ý cảnh phải lấy từ đây, không viết chung chung
${pack.shotVocabulary.map((s) => `- ${s}`).join("\n")}

TUYỆT ĐỐI KHÔNG NÓI
${pack.bannedClaims.map((b) => `- ${b.why} → ${b.fix}`).join("\n")}

CẤU TRÚC BẮT BUỘC CHO MỖI KỊCH BẢN
- Tổng đúng 30 giây, chia thành 4-6 cảnh, tổng thời lượng các cảnh phải bằng 30.
- Cảnh đầu tiên là hook, đúng 3 giây, và phải nói được trong 3 giây (tối đa 12 chữ).
- Lời thoại viết như người thật nói chuyện, không phải văn viết. Đọc to lên phải lọt tai.
- Mỗi cảnh có: thời lượng, lời thoại, mô tả cảnh quay cụ thể (góc máy + hành động), chữ hiện trên màn hình.
- Kết bằng một lời kêu gọi hành động cụ thể, không phải "inbox shop nhé".
- 5 kịch bản phải khác nhau về góc tiếp cận, không phải 5 biến thể của một ý.

TỐC ĐỘ NÓI: người Việt nói khoảng 2.5 chữ/giây trong video ngắn. Lời thoại phải vừa với thời lượng cảnh — cảnh 5 giây thì tối đa khoảng 13 chữ.`;
}

export function buildScriptUser(args: {
  info: ProductInfo;
  hasImage: boolean;
}): string {
  return `${args.hasImage ? "Ảnh sản phẩm ở trên.\n\n" : ""}THÔNG TIN SẢN PHẨM
${infoLines(args.info)}

Viết 5 kịch bản video 30 giây khác nhau.`;
}
