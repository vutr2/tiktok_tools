import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Không được để dấu xung đột merge lọt vào mã nguồn.
 *
 * Chuyện đã xảy ra: một lần merge để lại `<<<<<<<` trong `layout.tsx` và
 * `meta-pixel.tsx`, rồi commit luôn. `git status` sạch nên nhìn không ra, mà
 * `next build` thì gãy — Vercel deploy hỏng, production đứng im ở bản cũ. Meta
 * báo "chưa kết nối được pixel", và triệu chứng đó chẳng gợi gì tới nguyên nhân.
 *
 * Test này chạy trong vài mili giây và bắt được ngay tại chỗ.
 */

const BO_QUA = new Set(["node_modules", ".next", ".git", "dist", "coverage"]);
const DUOI = /\.(ts|tsx|js|jsx|mjs|cjs|css|json|sql|md)$/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (BO_QUA.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (DUOI.test(p)) out.push(p);
  }
  return out;
}

/**
 * Phải neo đầu dòng. `=======` giữa dòng là chuyện bình thường trong markdown
 * (gạch chân tiêu đề) và trong comment kẻ khung.
 */
const DAU_XUNG_DOT = [
  /^<{7} /m, // <<<<<<< HEAD
  /^>{7} /m, // >>>>>>> branch
  /^\|{7} /m, // ||||||| base (kiểu diff3)
];

describe("không còn dấu xung đột merge", () => {
  const files = walk(join(process.cwd(), "src")).concat(
    walk(join(process.cwd(), "tests")),
  );

  it("quét được file, tức là bộ dò hoạt động", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("không file nào chứa dấu xung đột", () => {
    const dinh: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      if (DAU_XUNG_DOT.some((re) => re.test(src))) {
        dinh.push(relative(process.cwd(), f));
      }
    }
    // Liệt kê thẳng tên file, khỏi phải đi tìm.
    expect(dinh).toEqual([]);
  });

  it("bộ dò thật sự nhận ra dấu xung đột", () => {
    const mau = ["<<<<<<< HEAD", "a", "=======", "b", ">>>>>>> nhanh-kia"].join(
      "\n",
    );
    expect(DAU_XUNG_DOT.some((re) => re.test(mau))).toBe(true);
  });

  it("không báo nhầm gạch chân tiêu đề markdown", () => {
    // `=======` một mình là hợp lệ trong markdown, nên không nằm trong bộ dò.
    const md = ["Tiêu đề", "=======", "", "nội dung"].join("\n");
    expect(DAU_XUNG_DOT.some((re) => re.test(md))).toBe(false);
  });
});
