/**
 * Kinh tế đơn vị — MỘT nguồn sự thật duy nhất.
 *
 * Quy tắc: không con số giá nào được viết rải rác trong code. Muốn đổi tỷ lệ
 * credit thì sửa đúng file này, rồi chạy `npm run economics` để xem biên còn lại.
 */

export type GenerationKind = "PRODUCT_PHOTO" | "LISTING_COPY" | "VIDEO_SCRIPT";

/**
 * Tỷ lệ credit đã chốt:
 *   1 credit  = 1 lần sinh text
 *   5 credit  = 1 ảnh (mỗi bối cảnh là một ảnh)
 *
 * Ảnh sản phẩm tính theo SỐ BỐI CẢNH người dùng chọn, không phải theo job.
 * Chạy đủ 4 bối cảnh = 20 credit = 1/3 gói 99k. Con số này là cố ý phơi ra
 * cho người dùng thấy trước khi bấm, xem docs/unit-economics.md.
 */
export const CREDIT_COST = {
  PRODUCT_PHOTO_PER_SCENE: 5,
  LISTING_COPY: 1,
  VIDEO_SCRIPT: 1,
} as const;

export const PHOTO_SCENES_PER_PRODUCT = 4;

export type CreditPack = {
  id: string;
  name: string;
  priceVnd: number;
  credits: number;
  /** MIXED = dùng cho cả text lẫn ảnh. IMAGE_ONLY = credit chỉ tiêu được cho ảnh. */
  kind: "MIXED" | "IMAGE_ONLY";
  enabled: boolean;
  note?: string;
};

/**
 * Gói bán. Gói ảnh riêng đã dựng sẵn nhưng TẮT — chỉ bật khi số đo thực tế
 * cho thấy biên ảnh trong gói MIXED quá mỏng (xem `verdict()` bên dưới).
 */
export const PACKS: CreditPack[] = [
  {
    id: "starter_99k",
    name: "Gói 99k",
    priceVnd: 99_000,
    credits: 60,
    kind: "MIXED",
    enabled: true,
  },
  {
    id: "image_99k",
    name: "Gói ảnh 99k",
    priceVnd: 99_000,
    credits: 60,
    kind: "IMAGE_ONLY",
    enabled: false,
    note: "Bật gói này nếu biên ảnh trong gói MIXED xuống dưới ngưỡng an toàn.",
  },
];

export const DEFAULT_PACK_ID = "starter_99k";

export function getPack(id: string): CreditPack | undefined {
  return PACKS.find((p) => p.id === id);
}

export function activePacks(): CreditPack[] {
  return PACKS.filter((p) => p.enabled);
}

/** Doanh thu quy đổi cho 1 credit, theo gói mặc định. */
export function revenuePerCreditVnd(packId: string = DEFAULT_PACK_ID): number {
  const pack = getPack(packId);
  if (!pack) throw new Error(`Không có gói ${packId}`);
  return pack.priceVnd / pack.credits; // 99_000 / 60 = 1_650
}

// ---------------------------------------------------------------------------
// Giá vốn
// ---------------------------------------------------------------------------

/** Giá token Claude, USD / 1 triệu token. Nguồn: bảng giá Claude API. */
export const CLAUDE_TOKEN_PRICE_USD_PER_MTOK = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
} as const;

export type ClaudeModelId = keyof typeof CLAUDE_TOKEN_PRICE_USD_PER_MTOK;

export function usdToVnd(usd: number): number {
  const rate = Number(process.env.USD_VND ?? 26_300);
  return usd * rate;
}

export function claudeCostVnd(
  model: ClaudeModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = CLAUDE_TOKEN_PRICE_USD_PER_MTOK[model];
  const usd =
    (inputTokens / 1_000_000) * price.input +
    (outputTokens / 1_000_000) * price.output;
  return usdToVnd(usd);
}

/**
 * Giá vốn ảnh. `null` = CHƯA ĐO.
 *
 * Không đặt số phỏng đoán ở đây. Cách lấy số thật:
 *   1. `npm run probe:image-cost` — chạy N ảnh thật, ghi chi phí vào generations.providerCostVnd
 *   2. `npm run economics` — đọc số đo, tính biên, đề xuất tỷ lệ credit
 */
export function measuredImageCostVnd(): number | null {
  const raw = process.env.IMAGE_COST_VND_PER_SCENE;
  if (!raw || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function measuredBgRemovalCostVnd(): number | null {
  const raw = process.env.BG_REMOVAL_COST_VND;
  if (!raw || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ---------------------------------------------------------------------------
// Biên lợi nhuận
// ---------------------------------------------------------------------------

export type MarginRow = {
  kind: GenerationKind;
  label: string;
  credits: number;
  revenueVnd: number;
  costVnd: number | null;
  grossVnd: number | null;
  /** Biên gộp, 0..1. `null` khi chưa có giá vốn thật. */
  marginPct: number | null;
  /** Số credit tối thiểu để đạt `targetMargin`. `null` khi chưa đo. */
  suggestedCredits: number | null;
};

/** Ngưỡng biên gộp coi là an toàn cho một MVP tự nuôi được hạ tầng + hoàn tiền lỗi. */
export const TARGET_MARGIN = 0.6;

export function marginRow(args: {
  kind: GenerationKind;
  label: string;
  credits: number;
  costVnd: number | null;
  packId?: string;
  targetMargin?: number;
}): MarginRow {
  const target = args.targetMargin ?? TARGET_MARGIN;
  const perCredit = revenuePerCreditVnd(args.packId);
  const revenueVnd = args.credits * perCredit;
  const costVnd = args.costVnd;

  if (costVnd === null) {
    return {
      kind: args.kind,
      label: args.label,
      credits: args.credits,
      revenueVnd,
      costVnd: null,
      grossVnd: null,
      marginPct: null,
      suggestedCredits: null,
    };
  }

  const grossVnd = revenueVnd - costVnd;
  return {
    kind: args.kind,
    label: args.label,
    credits: args.credits,
    revenueVnd,
    costVnd,
    grossVnd,
    marginPct: revenueVnd === 0 ? null : grossVnd / revenueVnd,
    // revenue = credits * perCredit; cần credits sao cho 1 - cost/revenue >= target
    suggestedCredits: Math.max(
      1,
      Math.ceil(costVnd / ((1 - target) * perCredit)),
    ),
  };
}

export function verdict(rows: MarginRow[]): {
  ok: boolean;
  unmeasured: GenerationKind[];
  thin: MarginRow[];
  negative: MarginRow[];
} {
  const unmeasured = rows.filter((r) => r.marginPct === null).map((r) => r.kind);
  const negative = rows.filter((r) => r.grossVnd !== null && r.grossVnd < 0);
  const thin = rows.filter(
    (r) => r.marginPct !== null && r.marginPct >= 0 && r.marginPct < TARGET_MARGIN,
  );
  return {
    ok: unmeasured.length === 0 && negative.length === 0 && thin.length === 0,
    unmeasured,
    thin,
    negative,
  };
}

export function formatVnd(n: number): string {
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}
