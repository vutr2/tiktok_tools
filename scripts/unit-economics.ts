/**
 * Tính kinh tế đơn vị TRƯỚC khi code thêm bất cứ thứ gì.
 *
 *   npm run economics
 *
 * Thứ tự tin cậy của giá vốn:
 *   1. `generations.providerCostVnd` — chi phí thật của những lần đã chạy
 *   2. `IMAGE_COST_VND_PER_SCENE` — số đối soát từ hoá đơn provider
 *   3. Giá niêm yết của model đang cấu hình
 *
 * Không có nguồn nào thì script báo đỏ và từ chối kết luận. Thà không có số còn
 * hơn có số đoán.
 */

import {
  CREDIT_COST,
  DEFAULT_IMAGE_MODEL,
  IMAGE_CALLS_PER_PRODUCT,
  IMAGE_MODELS,
  PHOTO_SCENES_PER_PRODUCT,
  TARGET_MARGIN,
  claudeCostVnd,
  formatVnd,
  imageCost,
  marginRow,
  revenuePerCreditVnd,
  verdict,
  type ImageModelId,
  type MarginRow,
} from "../src/lib/pricing";

type Measured = { costVnd: number; samples: number; source: string };

async function fromDatabase(): Promise<Record<string, Measured>> {
  if (!process.env.DATABASE_URL) return {};
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const rows = await prisma.generation.groupBy({
      by: ["type"],
      where: { status: "SUCCEEDED", providerCostVnd: { not: null } },
      _avg: { providerCostVnd: true },
      _count: { _all: true },
    });
    await prisma.$disconnect();

    const out: Record<string, Measured> = {};
    for (const r of rows) {
      if (r._avg.providerCostVnd == null) continue;
      out[r.type] = {
        costVnd: r._avg.providerCostVnd,
        samples: r._count._all,
        source: `đã chạy thật ${r._count._all} lần`,
      };
    }
    return out;
  } catch {
    return {};
  }
}

/** Ước tính chi phí text từ bảng giá token khi chưa có lần chạy thật nào. */
function estimateTextCost(kind: "LISTING_COPY" | "VIDEO_SCRIPT"): Measured {
  // Prompt hệ thống theo ngành ~1200 token, ảnh ~1500 token, thông tin SP ~300.
  const input = 3_000;
  const output = kind === "LISTING_COPY" ? 900 : 3_200;
  return {
    costVnd: claudeCostVnd("claude-opus-5", input, output),
    samples: 0,
    source: `bảng giá token (${input} in / ${output} out)`,
  };
}

function bar(pct: number | null): string {
  if (pct === null) return "—";
  const filled = Math.max(0, Math.min(20, Math.round(pct * 20)));
  return `${"█".repeat(filled)}${"·".repeat(20 - filled)} ${(pct * 100).toFixed(0)}%`;
}

async function main() {
  const db = await fromDatabase();

  const model = (process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_IMAGE_MODEL) as ImageModelId;
  const quote = imageCost({ model });

  const image: Measured | null = db.PRODUCT_PHOTO
    ? db.PRODUCT_PHOTO
    : quote.costVnd !== null
      ? {
          costVnd: quote.costVnd,
          samples: 0,
          source:
            quote.source === "INVOICE"
              ? "đối soát hoá đơn (IMAGE_COST_VND_PER_SCENE)"
              : `giá niêm yết ${model}`,
        }
      : null;

  const listing = db.LISTING_COPY ?? estimateTextCost("LISTING_COPY");
  const script = db.VIDEO_SCRIPT ?? estimateTextCost("VIDEO_SCRIPT");
  const perCredit = revenuePerCreditVnd();

  const rows: MarginRow[] = [
    marginRow({
      kind: "PRODUCT_PHOTO",
      label: "Ảnh sản phẩm (1 bối cảnh)",
      credits: CREDIT_COST.PRODUCT_PHOTO_PER_SCENE,
      costVnd: image?.costVnd ?? null,
    }),
    marginRow({
      kind: "LISTING_COPY",
      label: "Mô tả sàn",
      credits: CREDIT_COST.LISTING_COPY,
      costVnd: listing.costVnd,
    }),
    marginRow({
      kind: "VIDEO_SCRIPT",
      label: "5 kịch bản video",
      credits: CREDIT_COST.VIDEO_SCRIPT,
      costVnd: script.costVnd,
    }),
  ];

  console.log("\n=== KINH TẾ ĐƠN VỊ ===\n");
  console.log(`Model ảnh:          ${model}`);
  console.log(`Doanh thu / credit: ${formatVnd(perCredit)}`);
  console.log(`Biên mục tiêu:      ${(TARGET_MARGIN * 100).toFixed(0)}%\n`);

  const sources: Record<string, string> = {
    PRODUCT_PHOTO: image?.source ?? "CHƯA CÓ SỐ",
    LISTING_COPY: listing.source,
    VIDEO_SCRIPT: script.source,
  };

  for (const r of rows) {
    console.log(`${r.label}`);
    console.log(`  credit:      ${r.credits}`);
    console.log(`  doanh thu:   ${formatVnd(r.revenueVnd)}`);
    console.log(
      `  giá vốn:     ${r.costVnd === null ? "CHƯA CÓ SỐ" : formatVnd(r.costVnd)}  [${sources[r.kind]}]`,
    );
    console.log(
      `  lãi gộp:     ${r.grossVnd === null ? "—" : formatVnd(r.grossVnd)}`,
    );
    console.log(`  biên:        ${bar(r.marginPct)}`);
    if (r.suggestedCredits !== null && r.suggestedCredits !== r.credits) {
      console.log(
        `  → để đạt ${(TARGET_MARGIN * 100).toFixed(0)}% cần ${r.suggestedCredits} credit (đang ${r.credits})`,
      );
    }
    console.log("");
  }

  // Một sản phẩm chạy trọn bộ: 1 lần tách nền + 4 bối cảnh + mô tả + kịch bản.
  const fullPhoto =
    image === null ? null : image.costVnd * IMAGE_CALLS_PER_PRODUCT;
  const fullCredits =
    CREDIT_COST.PRODUCT_PHOTO_PER_SCENE * PHOTO_SCENES_PER_PRODUCT +
    CREDIT_COST.LISTING_COPY +
    CREDIT_COST.VIDEO_SCRIPT;
  const fullRevenue = fullCredits * perCredit;
  const fullCost =
    fullPhoto === null ? null : fullPhoto + listing.costVnd + script.costVnd;

  console.log("--- Một sản phẩm chạy trọn bộ (4 ảnh + mô tả + kịch bản) ---");
  console.log(
    `  credit tiêu:  ${fullCredits} (${((fullCredits / 60) * 100).toFixed(0)}% gói 99k)`,
  );
  console.log(`  doanh thu:    ${formatVnd(fullRevenue)}`);
  console.log(
    `  giá vốn:      ${fullCost === null ? "CHƯA CÓ SỐ" : `${formatVnd(fullCost)} (${IMAGE_CALLS_PER_PRODUCT} lần gọi ảnh + 2 lần text)`}`,
  );
  if (fullCost !== null) {
    console.log(
      `  lãi gộp:      ${formatVnd(fullRevenue - fullCost)}  (${(((fullRevenue - fullCost) / fullRevenue) * 100).toFixed(0)}%)`,
    );
  }
  console.log("");

  // So giá các model ảnh còn lại.
  console.log("--- Nếu đổi model ảnh ---");
  for (const [id, spec] of Object.entries(IMAGE_MODELS)) {
    const cost = imageCost({ model: id }).costVnd;
    const row = marginRow({
      kind: "PRODUCT_PHOTO",
      label: spec.label,
      credits: CREDIT_COST.PRODUCT_PHOTO_PER_SCENE,
      costVnd: process.env.IMAGE_COST_VND_PER_SCENE ? null : cost,
    });
    const mark = id === model ? "→" : " ";
    console.log(
      `  ${mark} ${spec.label.padEnd(42)} ${cost === null ? "—" : formatVnd(cost).padStart(9)} / ảnh   biên ${
        row.marginPct === null ? "—" : `${(row.marginPct * 100).toFixed(0)}%`
      }`,
    );
    console.log(`     ${spec.note}`);
  }
  console.log("");

  const v = verdict(rows);
  let hardFail = false;

  if (v.unmeasured.length > 0) {
    hardFail = true;
    console.log("🔴 CHƯA CHỐT ĐƯỢC TỶ LỆ CREDIT");
    console.log(`   Thiếu giá vốn của: ${v.unmeasured.join(", ")}\n`);
  }

  for (const r of v.negative) {
    hardFail = true;
    console.log(`🔴 LỖ: ${r.label} — mỗi lần chạy mất ${formatVnd(-r.grossVnd!)}.`);
    console.log(`   Nâng lên ${r.suggestedCredits} credit, hoặc hạ effort/model.\n`);
  }

  for (const r of v.thin) {
    console.log(
      `🟡 BIÊN MỎNG: ${r.label} còn ${(r.marginPct! * 100).toFixed(0)}%, dưới mục tiêu ${(TARGET_MARGIN * 100).toFixed(0)}%.`,
    );
    if (r.kind === "PRODUCT_PHOTO") {
      console.log(
        "   → Cân nhắc tách ảnh thành gói riêng (PACKS: bật image_99k), giữ text làm mồi kéo người dùng.\n",
      );
    } else {
      console.log(`   → Nâng lên ${r.suggestedCredits} credit.\n`);
    }
  }

  if (quote.source === "LIST_PRICE" && !db.PRODUCT_PHOTO) {
    console.log("🟡 Giá ảnh đang lấy từ GIÁ NIÊM YẾT, chưa đối soát hoá đơn.");
    console.log("   Hoá đơn thật còn có lần gọi hỏng, retry và thuế. Sau vài trăm");
    console.log("   ảnh đầu tiên, lấy số trên bảng billing chia cho số ảnh rồi điền:");
    console.log("     IMAGE_COST_VND_PER_SCENE=<vnd mỗi ảnh>\n");
  }

  if (v.ok) console.log("🟢 Tỷ lệ credit hiện tại đạt biên mục tiêu.\n");

  process.exit(hardFail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
