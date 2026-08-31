/**
 * Đo giá THỰC TẾ mỗi ảnh của provider.
 *
 *   IMAGE_PROVIDER=higgsfield npm run probe:image-cost -- ./mau.jpg 5
 *
 * Chạy N lần sinh ảnh thật, in ra chi phí trung bình. Nếu provider không trả về
 * chi phí trong response thì script nói thẳng là không đọc được — lúc đó phải
 * mở bảng billing của provider, chia số tiền cho số ảnh, rồi điền tay vào
 * IMAGE_COST_VND_PER_SCENE. Không có đường tắt và không được đoán.
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
      "IMAGE_PROVIDER đang là 'mock' — số đo sẽ vô nghĩa. Đặt IMAGE_PROVIDER=higgsfield.",
    );
    process.exit(1);
  }

  const data = await readFile(path.resolve(file));
  const mime = file.endsWith(".png") ? "image/png" : "image/jpeg";

  console.log(`Provider: ${provider.name} | ngành: ${industry} | ${count} lần\n`);

  const cut = await provider.removeBackground({ data, mime });
  console.log(
    `Tách nền: ${cut.costVnd === null ? "provider không trả về chi phí" : formatVnd(cut.costVnd)}`,
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
      console.log(`  ${i + 1}. ${scene.name} — ${seconds}s — chi phí: không đọc được`);
    } else {
      costs.push(out.costVnd);
      console.log(`  ${i + 1}. ${scene.name} — ${seconds}s — ${formatVnd(out.costVnd)}`);
    }
  }

  console.log("");
  if (costs.length === 0) {
    console.log("Provider không trả về chi phí trong response.");
    console.log("Mở bảng billing của provider, lấy số tiền đã tiêu chia cho");
    console.log(`${count} ảnh vừa chạy, rồi điền vào .env:`);
    console.log("  IMAGE_COST_VND_PER_SCENE=<số vnd mỗi ảnh>");
    console.log("Sau đó chạy `npm run economics`.");
    process.exit(1);
  }

  const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
  console.log(`Trung bình ${costs.length} ảnh: ${formatVnd(avg)}`);
  if (unknown > 0) console.log(`(${unknown} lần không đọc được chi phí)`);
  console.log(`\nĐiền vào .env:  IMAGE_COST_VND_PER_SCENE=${Math.round(avg)}`);
  console.log("Rồi chạy: npm run economics");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
