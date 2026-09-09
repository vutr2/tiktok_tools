import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Mọi đường dẫn nội bộ trong code phải trỏ tới một trang có thật.
 *
 * Lỗi đã xảy ra: sau khi đăng nhập, app đẩy sang `/app/onboarding` — nhưng thư
 * mục là `src/app/onboarding`, cùng cấp với `app/` chứ không nằm trong nó. Người
 * dùng vừa đăng ký xong đâm thẳng vào trang 404. TypeScript không bắt được
 * chuyện này vì đó chỉ là một chuỗi ký tự.
 *
 * Test dò cây thư mục để dựng danh sách route, rồi đối chiếu từng chuỗi đường
 * dẫn tìm thấy trong mã nguồn.
 */

const APP = join(process.cwd(), "src", "app");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** Thư mục chứa page.tsx -> mẫu route. `(nhóm)` không xuất hiện trên URL. */
function routePatterns(): string[][] {
  return walk(APP)
    .filter((f) => /(^|[/\\])page\.tsx$/.test(f))
    .map((f) =>
      relative(APP, f)
        .replace(/(^|[/\\])page\.tsx$/, "")
        .split(/[/\\]/)
        .filter((s) => s.length > 0 && !/^\(.*\)$/.test(s)),
    );
}

/** Thư mục chứa route.ts -> endpoint API. */
function apiPatterns(): string[][] {
  return walk(APP)
    .filter((f) => /(^|[/\\])route\.ts$/.test(f))
    .map((f) =>
      relative(APP, f)
        .replace(/(^|[/\\])route\.ts$/, "")
        .split(/[/\\]/)
        .filter((s) => s.length > 0 && !/^\(.*\)$/.test(s)),
    );
}

/** `[id]` khớp mọi đoạn; `[...slug]` khớp phần đuôi còn lại. */
function matches(pattern: string[], path: string[]): boolean {
  if (pattern.some((s) => /^\[\.\.\./.test(s))) {
    const head = pattern.findIndex((s) => /^\[\.\.\./.test(s));
    return (
      path.length >= head &&
      pattern.slice(0, head).every((s, i) => s.startsWith("[") || s === path[i])
    );
  }
  if (pattern.length !== path.length) return false;
  return pattern.every((s, i) => s.startsWith("[") || s === path[i]);
}

const PAGES = routePatterns();
const APIS = apiPatterns();

function segments(url: string): string[] {
  return url.split("?")[0].split("#")[0].split("/").filter(Boolean);
}

function isKnownPage(url: string): boolean {
  const segs = segments(url);
  if (segs.length === 0) return PAGES.some((p) => p.length === 0);
  return PAGES.some((p) => matches(p, segs));
}

function isKnownApi(url: string): boolean {
  const segs = segments(url);
  return APIS.some((p) => matches(p, segs));
}

/**
 * Gom mọi đường dẫn nội bộ viết dưới dạng chuỗi ký tự nguyên vẹn.
 *
 * Chỉ lấy chuỗi thuần: template literal có biến (`/app/p/${id}`) thì phần động
 * không kiểm được, và route động đã có `[id]` lo.
 */
function literalPaths(): { file: string; url: string; kind: "nav" | "api" }[] {
  const found: { file: string; url: string; kind: "nav" | "api" }[] = [];
  const files = walk(join(process.cwd(), "src")).filter((f) =>
    /\.(ts|tsx)$/.test(f),
  );

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const rel = relative(process.cwd(), file);

    // redirect("/x") · router.replace("/x") · router.push("/x") · href="/x"
    const re =
      /(?:redirect|router\.replace|router\.push)\(\s*"(\/[^"${}]*)"|href=\{?\s*"(\/[^"${}]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const url = m[1] ?? m[2];
      if (url) found.push({ file: rel, url, kind: "nav" });
    }

    // fetch("/api/x")
    const reApi = /fetch\(\s*"(\/api\/[^"${}]*)"/g;
    while ((m = reApi.exec(src)) !== null) {
      found.push({ file: rel, url: m[1], kind: "api" });
    }
  }
  return found;
}

describe("cây route", () => {
  it("đọc được các trang từ thư mục", () => {
    const flat = PAGES.map((p) => "/" + p.join("/"));
    expect(flat).toContain("/onboarding");
    expect(flat).toContain("/app");
    expect(flat).toContain("/app/wallet");
    // Cái bẫy: KHÔNG có route này, dù tên nghe rất hợp lý.
    expect(flat).not.toContain("/app/onboarding");
  });

  it("có ít nhất vài trang, tức là bộ dò hoạt động", () => {
    expect(PAGES.length).toBeGreaterThan(5);
    expect(APIS.length).toBeGreaterThan(5);
  });
});

/**
 * Đường dẫn đã biết là hỏng nhưng KHÔNG BAO GIỜ CHẠY TỚI.
 *
 * `/api/payments/cancel` không tồn tại. Nó nằm trong `buy.tsx`, ở nhánh chỉ
 * chạy khi state `order` khác null — mà `setOrder` chỉ được gọi duy nhất với
 * `null`. Cả khối chuyển khoản ngân hàng lẫn nút "Huỷ đơn này" là tàn dư từ
 * trước khi chuyển sang SePay, không render ra bao giờ.
 *
 * Để đây thay vì xoá vì đó là quyết định của chủ dự án: hoặc bỏ hẳn khối chết,
 * hoặc viết endpoint huỷ đơn thật. Xử lý xong thì XOÁ dòng này đi — danh sách
 * miễn trừ chỉ được phép ngắn và có lý do.
 */
const CHUA_XU_LY = ["/api/payments/cancel"];

describe("mọi điều hướng trong code trỏ tới trang có thật", () => {
  const paths = literalPaths().filter((p) => !CHUA_XU_LY.includes(p.url));

  it("tìm thấy các đường dẫn để kiểm", () => {
    expect(paths.length).toBeGreaterThan(5);
  });

  it("không có đường dẫn nào dẫn tới 404", () => {
    const hong = paths
      .filter(({ url, kind }) =>
        kind === "api" || url.startsWith("/api/")
          ? !isKnownApi(url)
          : !isKnownPage(url),
      )
      .map(({ file, url }) => `${url}  ← ${file}`);

    // Thông báo liệt kê thẳng chỗ sai, khỏi phải đi tìm.
    expect(hong).toEqual([]);
  });
});

describe("danh sách miễn trừ", () => {
  it("từng mục vẫn đúng là đường dẫn KHÔNG tồn tại", () => {
    // Nếu ai đó tạo endpoint thật, test này đỏ và nhắc xoá mục khỏi danh sách.
    for (const url of CHUA_XU_LY) {
      expect(isKnownApi(url) || isKnownPage(url)).toBe(false);
    }
  });

  it("vẫn còn được gọi trong code — hết gọi thì xoá khỏi danh sách", () => {
    const urls = literalPaths().map((p) => p.url);
    for (const url of CHUA_XU_LY) expect(urls).toContain(url);
  });
});

describe("bộ so khớp route", () => {
  it("khớp đoạn động", () => {
    expect(matches(["app", "p", "[id]"], ["app", "p", "abc"])).toBe(true);
    expect(matches(["app", "p", "[id]"], ["app", "p"])).toBe(false);
    expect(matches(["app"], ["app", "onboarding"])).toBe(false);
  });

  it("phân biệt /onboarding với /app/onboarding", () => {
    expect(isKnownPage("/onboarding")).toBe(true);
    expect(isKnownPage("/app/onboarding")).toBe(false);
  });

  it("bỏ qua query và hash", () => {
    expect(isKnownPage("/app/wallet?paid=1")).toBe(true);
    expect(isKnownPage("/app#top")).toBe(true);
  });
});
