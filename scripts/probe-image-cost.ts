/**
 * Chạy thử N ảnh THẬT để lấy số đối soát.
 *
 *   IMAGE_PROVIDER=gemini npm run probe:image-cost -- ./mau.jpg 5
 *
 * Provider trả về chi phí ước theo giá niêm yết cho từng lần gọi. Script in ra
 * tổng, rồi nhắc mở bảng billing của Google đối chiếu — con số trên hoá đơn mới
 * là con số để chốt tỷ lệ credit, vì nó tính cả lần gọi hỏng và thuế.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { imageProvider } from "../src/lib/ai/image";
import { allScenes, buildPhotoPrompt } from "../src/prompts";
import { formatVnd } from "../src/lib/pricing";
import type { Industry } from "../src/lib/industries";

async function main() {
  const [file, countArg, industryArg] = process.argv.slice(2);
  if (!file) {
    console.error("Dùng: npm run probe:image-cost -- <ảnh.jpg> [số lần] [ngành]");
    process.exit(1);
  }

  const count = Number(countArg ?? 4);
  const industry = (industryArg ?? "MY_PHAM") as Industry;
  const provider = imageProvider();

  if (provider.name === "mock") {
    console.error(
      "IMAGE_PROVIDER đang là 'mock' — số đo sẽ vô nghĩa. Đặt IMAGE_PROVIDER=gemini.",
    );
    process.exit(1);
  }

  const data = await readFile(path.resolve(file));
  const mime = file.endsWith(".png") ? "image/png" : "image/jpeg";

  console.log(`Provider: ${provider.name} | ngành: ${industry} | ${count} ảnh\n`);

  const started0 = Date.now();
  const cut = await provider.removeBackground({ data, mime });
  console.log(
    `Tách nền: ${((Date.now() - started0) / 1000).toFixed(1)}s — ${
      cut.costVnd === null ? "không tính được chi phí" : formatVnd(cut.costVnd)
    } [${cut.costSource ?? "?"}]`,
  );

  const scenes = allScenes(industry);
  const costs: number[] = [];
  let unknown = 0;

  for (let i = 0; i < count; i++) {
    const scene = scenes[i % scenes.length];
    const spec = buildPhotoPrompt({
      industry,
      sceneId: scene.id,
      productName: "sample product",
    });

    const started = Date.now();
    const out = await provider.compose({
      subject: { data: cut.data, mime: cut.mime },
      prompt: spec.prompt,
      negative: spec.negative,
      aspect: spec.aspect,
    });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    if (out.costVnd === null) {
      unknown++;
      console.log(`  ${i + 1}. ${scene.name} — ${seconds}s — chi phí: không tính được`);
    } else {
      costs.push(out.costVnd);
      console.log(
        `  ${i + 1}. ${scene.name} — ${seconds}s — ${formatVnd(out.costVnd)} [${out.costSource}]`,
      );
    }
  }

  console.log("");
  if (costs.length === 0) {
    console.log("Không tính được chi phí lần nào. Kiểm tra lại GEMINI_IMAGE_MODEL");
    console.log("có nằm trong IMAGE_MODELS (src/lib/pricing.ts) hay không.");
    process.exit(1);
  }

  const total = costs.reduce((a, b) => a + b, 0) + (cut.costVnd ?? 0);
  const avg = costs.reduce((a, b) => a + b, 0) / costs.length;

  console.log(`Trung bình ${costs.length} ảnh: ${formatVnd(avg)}`);
  console.log(`Tổng cả lần tách nền:     ${formatVnd(total)}`);
  if (unknown > 0) console.log(`(${unknown} lần không tính được chi phí)`);

  console.log("\nBƯỚC TIẾP THEO — đây mới là số để chốt tỷ lệ credit:");
  console.log("  1. Mở bảng billing của Google, lấy số tiền thật của khoảng thời gian vừa chạy.");
  console.log(`  2. Chia cho ${costs.length + 1} lần gọi ảnh.`);
  console.log("  3. Điền vào .env:  IMAGE_COST_VND_PER_SCENE=<vnd mỗi ảnh>");
  console.log("  4. Chạy: npm run economics");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
