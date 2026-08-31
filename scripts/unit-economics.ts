/**
 * Tính kinh tế đơn vị TRƯỚC khi code thêm bất cứ thứ gì.
 *
 *   npm run economics
 *
 * Ưu tiên đọc số đo thật từ bảng `generations.providerCostVnd`. Không có DB thì
 * đọc từ env. Không có cả hai thì script BÁO ĐỎ và từ chối kết luận — đó là
 * điểm mấu chốt: thà không có số còn hơn có số đoán.
 */

import {
  CREDIT_COST,
  PHOTO_SCENES_PER_PRODUCT,
  TARGET_MARGIN,
  claudeCostVnd,
  formatVnd,
  marginRow,
  measuredBgRemovalCostVnd,
  measuredImageCostVnd,
  revenuePerCreditVnd,
  verdict,
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
        source: `DB (${r._count._all} lần chạy thật)`,
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
    source: `ước tính từ bảng giá token (${input} in / ${output} out)`,
  };
}

function bar(pct: number | null): string {
  if (pct === null) return "—";
  const filled = Math.max(0, Math.min(20, Math.round(pct * 20)));
  return `${"█".repeat(filled)}${"·".repeat(20 - filled)} ${(pct * 100).toFixed(0)}%`;
}

async function main() {
  const db = await fromDatabase();

  const imageMeasured: Measured | null = db.PRODUCT_PHOTO
    ? db.PRODUCT_PHOTO
    : measuredImageCostVnd() !== null
      ? {
          costVnd: measuredImageCostVnd()!,
          samples: 0,
          source: "env IMAGE_COST_VND_PER_SCENE",
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
      costVnd: imageMeasured?.costVnd ?? null,
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
  console.log(`Doanh thu / credit: ${formatVnd(perCredit)}`);
  console.log(`Biên mục tiêu:      ${(TARGET_MARGIN * 100).toFixed(0)}%\n`);

  const sources: Record<string, string> = {
    PRODUCT_PHOTO: imageMeasured?.source ?? "CHƯA ĐO",
    LISTING_COPY: listing.source,
    VIDEO_SCRIPT: script.source,
  };

  for (const r of rows) {
    console.log(`${r.label}`);
    console.log(`  credit:      ${r.credits}`);
    console.log(`  doanh thu:   ${formatVnd(r.revenueVnd)}`);
    console.log(
      `  giá vốn:     ${r.costVnd === null ? "CHƯA ĐO" : formatVnd(r.costVnd)}  [${sources[r.kind]}]`,
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

  // Chi phí một sản phẩm chạy trọn bộ.
  const fullPhoto =
    imageMeasured === null
      ? null
      : imageMeasured.costVnd * PHOTO_SCENES_PER_PRODUCT +
        (measuredBgRemovalCostVnd() ?? 0);
  const fullCredits =
    CREDIT_COST.PRODUCT_PHOTO_PER_SCENE * PHOTO_SCENES_PER_PRODUCT +
    CREDIT_COST.LISTING_COPY +
    CREDIT_COST.VIDEO_SCRIPT;

  console.log("--- Một sản phẩm chạy trọn bộ (4 ảnh + mô tả + kịch bản) ---");
  console.log(`  credit tiêu:  ${fullCredits} (${((fullCredits / 60) * 100).toFixed(0)}% gói 99k)`);
  console.log(`  doanh thu:    ${formatVnd(fullCredits * perCredit)}`);
  console.log(
    `  giá vốn:      ${
      fullPhoto === null
        ? "CHƯA ĐO (thiếu giá ảnh)"
        : formatVnd(fullPhoto + listing.costVnd + script.costVnd)
    }\n`,
  );

  const v = verdict(rows);

  if (v.unmeasured.length > 0) {
    console.log("🔴 CHƯA CHỐT ĐƯỢC TỶ LỆ CREDIT");
    console.log(`   Thiếu giá vốn thật của: ${v.unmeasured.join(", ")}`);
    console.log("   Chạy `npm run probe:image-cost <đường-dẫn-ảnh>` với provider thật,");
    console.log("   hoặc điền IMAGE_COST_VND_PER_SCENE vào .env sau khi đo.\n");
  }

  for (const r of v.negative) {
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

  if (v.ok) console.log("🟢 Tỷ lệ credit hiện tại đạt biên mục tiêu.\n");

  process.exit(v.unmeasured.length > 0 || v.negative.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
