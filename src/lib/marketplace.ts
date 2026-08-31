/**
 * Ràng buộc ký tự của sàn.
 *
 * CẢNH BÁO: đây là config, không phải sự thật vĩnh viễn. Các sàn đổi giới hạn
 * không báo trước. Trước mỗi lần launch, mở Seller Center đối chiếu lại 4 con số
 * dưới đây rồi sửa đúng file này — mọi chỗ khác trong code đọc từ đây.
 */

export type Marketplace = "SHOPEE" | "TIKTOK_SHOP";

export type MarketplaceRules = {
  label: string;
  titleMin: number;
  titleMax: number;
  descMin: number;
  descMax: number;
  /** Số hashtag nên dùng (không phải giới hạn cứng của sàn). */
  hashtagCount: number;
  /** Sàn có hiển thị hashtag trong mô tả sản phẩm không. */
  hashtagInDescription: boolean;
};

export const MARKETPLACE_RULES: Record<Marketplace, MarketplaceRules> = {
  SHOPEE: {
    label: "Shopee",
    titleMin: 10,
    titleMax: 120,
    descMin: 100,
    descMax: 3000,
    hashtagCount: 5,
    hashtagInDescription: true,
  },
  TIKTOK_SHOP: {
    label: "TikTok Shop",
    titleMin: 25,
    titleMax: 255,
    descMin: 100,
    descMax: 10_000,
    hashtagCount: 8,
    hashtagInDescription: true,
  },
};

export const MARKETPLACES = Object.keys(MARKETPLACE_RULES) as Marketplace[];

// ---------------------------------------------------------------------------
// Ghép tiêu đề cho vừa giới hạn
// ---------------------------------------------------------------------------

export type TitleSegment = {
  text: string;
  /** required = không bao giờ bị cắt. Segment optional bị bỏ dần từ cuối lên. */
  required?: boolean;
};

const SEP = " | ";

/**
 * Ghép các mảnh thành tiêu đề vừa `limit` ký tự.
 *
 * Quy tắc: bỏ nguyên cả segment optional từ cuối lên trước khi nghĩ tới việc cắt
 * chữ. Không bao giờ cắt giữa từ — tiêu đề cụt kiểu "Serum Niacinamide Cho Da D"
 * làm listing trông như hàng rác.
 */
export function fitTitle(segments: TitleSegment[], limit: number): string {
  const clean = segments
    .map((s) => ({ ...s, text: s.text.replace(/\s+/g, " ").trim() }))
    .filter((s) => s.text.length > 0);

  const kept = [...clean];
  while (kept.length > 0) {
    const joined = kept.map((s) => s.text).join(SEP);
    if (joined.length <= limit) return joined;

    // Bỏ segment optional cuối cùng.
    const lastOptional = findLastIndex(kept, (s) => !s.required);
    if (lastOptional === -1) break;
    kept.splice(lastOptional, 1);
  }

  // Chỉ còn segment bắt buộc mà vẫn dài -> cắt tại ranh giới từ.
  const joined = kept.map((s) => s.text).join(SEP);
  return truncateAtWord(joined, limit);
}

export function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[\s|,\-–]+$/, "");
}

function findLastIndex<T>(arr: T[], pred: (v: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}

// ---------------------------------------------------------------------------
// Kiểm tra tiêu đề
// ---------------------------------------------------------------------------

export type TitleIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
};

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

export function validateTitle(
  title: string,
  marketplace: Marketplace,
): TitleIssue[] {
  const rules = MARKETPLACE_RULES[marketplace];
  const issues: TitleIssue[] = [];
  const len = title.length;

  if (len > rules.titleMax) {
    issues.push({
      level: "error",
      code: "TOO_LONG",
      message: `Dài ${len}/${rules.titleMax} ký tự — ${rules.label} sẽ cắt hoặc từ chối.`,
    });
  }
  if (len < rules.titleMin) {
    issues.push({
      level: "error",
      code: "TOO_SHORT",
      message: `Chỉ ${len} ký tự, ${rules.label} yêu cầu tối thiểu ${rules.titleMin}.`,
    });
  }
  if (EMOJI_RE.test(title)) {
    issues.push({
      level: "warn",
      code: "EMOJI",
      message: "Có emoji trong tiêu đề — nhiều listing bị hạ hiển thị vì lý do này.",
    });
  }

  const letters = title.replace(/[^A-Za-zÀ-ỹ]/g, "");
  const upper = letters.replace(/[^A-ZÀ-Ỵ]/g, "");
  if (letters.length > 12 && upper.length / letters.length > 0.7) {
    issues.push({
      level: "warn",
      code: "SHOUTING",
      message: "Viết hoa gần hết tiêu đề — bị coi là spam.",
    });
  }

  const words = title
    .toLowerCase()
    .split(/[\s|,\-–]+/)
    .filter((w) => w.length > 3);
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const stuffed = [...counts.entries()].filter(([, c]) => c >= 3);
  if (stuffed.length > 0) {
    issues.push({
      level: "warn",
      code: "KEYWORD_STUFFING",
      message: `Lặp từ khoá quá nhiều: ${stuffed.map(([w]) => w).join(", ")}.`,
    });
  }

  return issues;
}

export function validateDescription(
  desc: string,
  marketplace: Marketplace,
): TitleIssue[] {
  const rules = MARKETPLACE_RULES[marketplace];
  const issues: TitleIssue[] = [];
  if (desc.length > rules.descMax) {
    issues.push({
      level: "error",
      code: "TOO_LONG",
      message: `Mô tả ${desc.length}/${rules.descMax} ký tự.`,
    });
  }
  if (desc.length < rules.descMin) {
    issues.push({
      level: "warn",
      code: "TOO_SHORT",
      message: `Mô tả ngắn (${desc.length} ký tự) — sàn ưu tiên mô tả đủ ý.`,
    });
  }
  return issues;
}

// ---------------------------------------------------------------------------
// Hashtag
// ---------------------------------------------------------------------------

export function normalizeHashtag(raw: string): string {
  const body = raw
    .replace(/^#+/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase();
  return body ? `#${body}` : "";
}

export function normalizeHashtags(raw: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of raw) {
    const t = normalizeHashtag(tag);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}
