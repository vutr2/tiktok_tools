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
  /** Nhãn trên thẻ gói. "Phổ biến" được tô đậm, các nhãn khác viền mờ. */
  badge?: string;
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
    // Ngừng bán từ khi chuyển sang gói trọn đời. Credit đã nạp vẫn tiêu được.
    enabled: false,
    badge: "Phổ biến",
  },
  {
    // 1.320đ/credit. Rẻ hơn gói 99k 20% nhưng biên ảnh vẫn 73% ở 5 credit —
    // kiểm lại bằng `npm run economics` mỗi lần đổi giá vốn provider.
    id: "saver_199k",
    name: "Gói 199k",
    priceVnd: 199_000,
    credits: 150,
    kind: "MIXED",
    enabled: false,
    badge: "Tiết kiệm",
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

// ---------------------------------------------------------------------------
// Gói trọn đời
// ---------------------------------------------------------------------------

/**
 * Mua một lần, dùng không giới hạn.
 *
 * CẢNH BÁO KINH TẾ — đọc trước khi đổi giá:
 * Giá vốn không biến mất khi bán trọn đời, chỉ chuyển sang mình chịu. Mỗi ảnh
 * vẫn tốn tiền provider thật. Điểm hoà vốn ở mức giá hiện tại nằm trong
 * `lifetimeBreakEven()` — vượt mốc đó là bù lỗ cho người dùng đó vĩnh viễn.
 *
 * Vì vậy `generations.providerCostVnd` càng quan trọng: đó là cách duy nhất
 * biết ai đang vượt mốc.
 */
export const LIFETIME_PLAN = {
  id: "lifetime",
  name: "Gói trọn đời",
  priceUsd: 200,
  blurb: "Trả một lần, dùng không giới hạn — ảnh, mô tả, kịch bản.",
} as const;

/**
 * Số lần sinh miễn phí trước khi phải mua gói trọn đời.
 *
 * 6 = đúng một sản phẩm trọn bộ (4 ảnh + mô tả + kịch bản). Người bán thử được
 * trọn vẹn một lần rồi mới quyết định — không phải đoán mò.
 *
 * Mỗi người dùng thử tốn của mình ~7.118đ (4 ảnh × 1.762đ + 2 lần text × 35đ).
 * Tăng con số này là tăng thẳng chi phí thu hút người dùng.
 */
export const FREE_TRIAL_GENERATIONS = Number(
  process.env.FREE_TRIAL_GENERATIONS ?? 6,
);

export function lifetimePriceVnd(): number {
  return Math.round(usdToVnd(LIFETIME_PLAN.priceUsd));
}

/**
 * Bao nhiêu lần dùng thì hết tiền đã thu.
 *
 * Không phải con số để khoe với người dùng — là con số để theo dõi vận hành.
 */
export function lifetimeBreakEven(costPerProductVnd: number): number {
  if (costPerProductVnd <= 0) return Infinity;
  return Math.floor(lifetimePriceVnd() / costPerProductVnd);
}

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
 * Giá DeepSeek, USD / 1 triệu token. Nguồn: trang giá chính thức của DeepSeek.
 *
 * `inputHit` là token trúng cache prefix — DeepSeek tự cache, rẻ hơn ~50 lần, và
 * prompt hệ thống theo ngành của app là hằng số nên tỷ lệ trúng sẽ cao.
 *
 * `null` = CHƯA đối soát được giá niêm yết. Biến thể vision đang ở diện thử
 * nghiệm và họ không công bố giá rõ ràng, nên để null thay vì đoán — cùng luật
 * với ảnh: không bịa số cho bảng kinh tế đơn vị trông có vẻ đầy đủ.
 */
export const DEEPSEEK_MODELS: Record<
  string,
  { inputMiss: number; inputHit: number; output: number } | null
> = {
  "deepseek-v4-flash": { inputMiss: 0.14, inputHit: 0.0028, output: 0.28 },
  "deepseek-v4-pro": { inputMiss: 0.435, inputHit: 0.003625, output: 0.87 },
  "deepseek-v4-flash-vision-exp": null,
};

/** VND cho một lần gọi DeepSeek. `null` khi chưa biết giá của model đó. */
export function deepseekCostVnd(
  model: string,
  tokens: { inputMiss: number; inputHit: number; output: number },
): number | null {
  const price = DEEPSEEK_MODELS[model];
  if (!price) return null;
  const usd =
    (tokens.inputMiss / 1_000_000) * price.inputMiss +
    (tokens.inputHit / 1_000_000) * price.inputHit +
    (tokens.output / 1_000_000) * price.output;
  return usdToVnd(usd);
}

// ---------------------------------------------------------------------------
// Giá vốn ảnh
// ---------------------------------------------------------------------------

/**
 * Các model sinh ảnh dùng được, kèm giá NIÊM YẾT mỗi ảnh ở độ phân giải mặc định.
 *
 * Giá niêm yết không phải giá đối soát: hoá đơn thật còn có lần gọi hỏng, lần
 * retry, và thuế. Đây là số để tính nhẩm, không phải số để chốt sổ — xem thứ tự
 * ưu tiên trong `imageCost()`.
 *
 * Đối chiếu lại bảng giá của Google trước mỗi lần đổi model.
 */
export const IMAGE_MODELS = {
  "gemini-3.1-flash-image-preview": {
    label: "Gemini 3.1 Flash Image (nano banana 2)",
    listPriceUsdPerImage: 0.067, // 1K; 512px rẻ hơn, 4K đắt hơn
    recommended: true,
    note: "Mặc định. Model sửa ảnh, giữ nguyên chủ thể tốt — điều kiện sống còn của ảnh sản phẩm.",
  },
  "gemini-3-pro-image-preview": {
    label: "Gemini 3 Pro Image (nano banana pro)",
    listPriceUsdPerImage: 0.134, // 1K/2K
    recommended: false,
    note: "Gấp đôi tiền. Chỉ bật nếu đo được là bản Flash không đủ chất cho ngành nào đó.",
  },
  "gemini-2.5-flash-image": {
    label: "Gemini 2.5 Flash Image (nano banana đời đầu)",
    listPriceUsdPerImage: 0.039,
    recommended: false,
    note: "Rẻ nhất nhưng họ Gemini 2.5 có lịch tắt 16/10/2026. Đừng xây lên nó.",
  },
} as const;

export type ImageModelId = keyof typeof IMAGE_MODELS;

export const DEFAULT_IMAGE_MODEL: ImageModelId = "gemini-3.1-flash-image-preview";

/**
 * Nguồn của con số giá vốn — quan trọng ngang bản thân con số.
 *
 *   INVOICE    số đối soát từ hoá đơn provider. Tin được.
 *   METERED    tính từ token API trả về × đơn giá token đã cấu hình.
 *   LIST_PRICE giá niêm yết. Dùng tạm, chưa đối soát.
 */
export type ImageCostSource = "INVOICE" | "METERED" | "LIST_PRICE";

export type ImageCostQuote = {
  costVnd: number | null;
  source: ImageCostSource | null;
};

/**
 * Giá một lần gọi sinh ảnh, theo thứ tự tin cậy giảm dần.
 *
 * Không có nguồn nào thì trả `null` — tuyệt đối không bịa một con số để bảng
 * kinh tế đơn vị trông có vẻ đầy đủ.
 */
export function imageCost(args: {
  model?: string;
  outputTokens?: number | null;
}): ImageCostQuote {
  // 1. Số đối soát từ hoá đơn, điền tay sau khi chạy thật.
  const invoice = envNumber("IMAGE_COST_VND_PER_SCENE");
  if (invoice !== null && invoice > 0) {
    return { costVnd: Math.round(invoice), source: "INVOICE" };
  }

  // 2. Đo theo token nếu đã cấu hình đơn giá token của model.
  const perMTok = envNumber("GEMINI_IMAGE_USD_PER_MTOK");
  if (perMTok !== null && perMTok > 0 && args.outputTokens && args.outputTokens > 0) {
    return {
      costVnd: Math.round(usdToVnd((args.outputTokens / 1_000_000) * perMTok)),
      source: "METERED",
    };
  }

  // 3. Giá niêm yết của model.
  const model = (args.model ?? DEFAULT_IMAGE_MODEL) as ImageModelId;
  const spec = IMAGE_MODELS[model];
  if (spec) {
    return {
      costVnd: Math.round(usdToVnd(spec.listPriceUsdPerImage)),
      source: "LIST_PRICE",
    };
  }

  return { costVnd: null, source: null };
}

function envNumber(key: string): number | null {
  const raw = process.env[key];
  if (!raw || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Số lần gọi sinh ảnh cho một sản phẩm chạy trọn bộ: 1 lần tách nền (cache lại,
 * chỉ chạy một lần cho mỗi sản phẩm) + 1 lần cho mỗi bối cảnh.
 */
export const IMAGE_CALLS_PER_PRODUCT = 1 + PHOTO_SCENES_PER_PRODUCT;

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
