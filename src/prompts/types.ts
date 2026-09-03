import type { Industry } from "@/lib/industries";

/**
 * Ranh giới từ có hỗ trợ tiếng Việt.
 *
 * `\b` của JavaScript chỉ biết ký tự ASCII, nên "sữa mẹ" hay "tác dụng phụ"
 * kết thúc bằng nguyên âm có dấu sẽ KHÔNG khớp `\b` — cụm cấm lọt lưới im lặng.
 * Dùng lookaround theo Unicode thay thế, và regex phải có cờ `u`.
 */
export const WB = "(?<![\\p{L}\\p{N}])";
export const WE = "(?![\\p{L}\\p{N}])";

export type PhotoScene = {
  id: string;
  /** Tên hiển thị cho người bán, tiếng Việt. */
  name: string;
  /** Một emoji gợi chất liệu bối cảnh — người bán nhận ra thẻ trước khi đọc chữ. */
  emoji: string;
  /** Dùng ảnh này ở đâu — người bán cần biết để chọn, không chọn bừa 4 cái. */
  useCase: string;
  /** Prompt cho model ảnh. Viết tiếng Anh vì model ảnh hiểu tiếng Anh tốt hơn. */
  prompt: string;
  negative: string;
  aspect: "1:1" | "4:5" | "9:16";
};

export type BannedClaim = {
  /** Regex (chuỗi, cờ `i`) khớp với cụm không được dùng. */
  pattern: string;
  why: string;
  fix: string;
};

export type PromptPack = {
  industry: Industry;
  /** Giọng bán của ngành — đây là thứ đối thủ dùng prompt chung chung không có. */
  voice: string;
  /** Người mua ngành này thật sự cân nhắc gì trước khi bấm mua. */
  buyerCares: string[];
  /** Phản đối hay gặp. Kịch bản video phải đập được ít nhất một cái. */
  objections: string[];
  /** Cách người mua gõ tìm kiếm trên sàn — quyết định cấu trúc tiêu đề. */
  searchPatterns: string[];
  /** Cụm từ cấm/rủi ro. Vừa nhét vào prompt, vừa dùng để hậu kiểm output. */
  bannedClaims: BannedClaim[];
  /** Ràng buộc pháp lý / chính sách sàn nhắc model. */
  compliance: string[];
  /** Mẫu hook 3 giây riêng của ngành. */
  hookPatterns: string[];
  /** Từ vựng cảnh quay riêng ngành, để gợi ý cảnh không bị chung chung. */
  shotVocabulary: string[];
  /** ĐÚNG 4 bối cảnh studio dựng sẵn. */
  scenes: [PhotoScene, PhotoScene, PhotoScene, PhotoScene];
};

/** Rà output xem có dính cụm cấm không. Chạy sau mỗi lần sinh text. */
export function lintClaims(
  text: string,
  pack: PromptPack,
): { pattern: string; matched: string; why: string; fix: string }[] {
  const hits: { pattern: string; matched: string; why: string; fix: string }[] =
    [];
  for (const claim of pack.bannedClaims) {
    const re = new RegExp(claim.pattern, "giu");
    const m = text.match(re);
    if (m && m.length > 0) {
      hits.push({
        pattern: claim.pattern,
        matched: [...new Set(m)].join(", "),
        why: claim.why,
        fix: claim.fix,
      });
    }
  }
  return hits;
}
