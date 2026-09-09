import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

/**
 * Giả lập tầng dữ liệu.
 *
 * supabase-js nối chuỗi phương thức rồi mới chạy: `.from().select().eq().eq()`
 * là một promise, còn `.maybeSingle()` trả promise ngay. Bộ giả lập dưới đây
 * bắt chước đúng hai kiểu đó và ghi lại mọi bộ lọc `.eq()` để kiểm tra rằng
 * truy vấn nào cũng có userId — thiếu nó là người này xoá được sản phẩm của
 * người kia.
 */
type QueryResult = { data?: unknown; error?: unknown };

type Logged = {
  table: string;
  op: "select" | "delete";
  filters: Record<string, unknown>;
};

const h = vi.hoisted(() => ({
  responses: [] as QueryResult[],
  queries: [] as Logged[],
  /** Thứ tự các bước có tác dụng phụ — để khẳng định xoá dòng trước, xoá file sau. */
  order: [] as string[],
  removeCalls: [] as string[][],
  storageResult: { removed: 0, error: null as string | null },
}));

vi.mock("@/lib/supabase", () => ({
  db: {
    from(table: string) {
      const entry: Logged = { table, op: "select", filters: {} };
      const result = h.responses.shift() ?? {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b: any = {
        select() {
          entry.op = "select";
          h.queries.push(entry);
          return b;
        },
        delete() {
          entry.op = "delete";
          h.queries.push(entry);
          h.order.push(`delete:${table}`);
          return b;
        },
        eq(col: string, val: unknown) {
          entry.filters[col] = val;
          return b;
        },
        maybeSingle: async () => result,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        then: (res: any, rej: any) => Promise.resolve(result).then(res, rej),
      };
      return b;
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  removeImages: async (keys: string[]) => {
    h.order.push("removeImages");
    h.removeCalls.push(keys);
    return h.storageResult;
  },
}));

const { deleteProduct } = await import("@/lib/products");

const USER = "user-1";
const PID = "prod-1";

function product(over: Record<string, unknown> = {}) {
  return {
    data: {
      id: PID,
      originalImageKey: `${USER}/raw/a.png`,
      cutoutImageKey: `${USER}/cutout/b.png`,
      ...over,
    },
  };
}

function photos(keys: (string | null)[]) {
  return { data: keys.map((key) => ({ output: key === null ? null : { key } })) };
}

beforeEach(() => {
  h.responses = [];
  h.queries = [];
  h.order = [];
  h.removeCalls = [];
  h.storageResult = { removed: 0, error: null };
});

describe("xoá sản phẩm", () => {
  it("không tìm thấy thì báo 404 và không đụng vào file nào", async () => {
    h.responses = [{ data: null }];

    await expect(deleteProduct({ userId: USER, productId: PID })).rejects.toThrow(
      AppError,
    );
    expect(h.removeCalls).toEqual([]);
    expect(h.order).toEqual([]);
  });

  it("sản phẩm của người khác cũng ra 404 — mọi truy vấn đều lọc userId", async () => {
    h.responses = [{ data: null }];

    await expect(
      deleteProduct({ userId: USER, productId: PID }),
    ).rejects.toMatchObject({ status: 404 });

    // Truy vấn tìm sản phẩm phải kèm userId, nếu không id của người khác sẽ
    // đọc được và xoá được.
    expect(h.queries[0].filters).toEqual({ id: PID, userId: USER });
  });

  it("gom đủ ảnh gốc, ảnh tách nền và ảnh bối cảnh", async () => {
    h.responses = [
      product(),
      photos([`${USER}/scene/wet_stone/c.png`, `${USER}/scene/silk_drape/d.png`]),
      { error: null },
    ];

    const res = await deleteProduct({ userId: USER, productId: PID });

    expect(h.removeCalls).toHaveLength(1);
    expect([...h.removeCalls[0]].sort()).toEqual(
      [
        `${USER}/cutout/b.png`,
        `${USER}/raw/a.png`,
        `${USER}/scene/silk_drape/d.png`,
        `${USER}/scene/wet_stone/c.png`,
      ].sort(),
    );
    expect(res.storageError).toBeNull();
  });

  it("chưa tách nền thì chỉ xoá ảnh gốc", async () => {
    h.responses = [
      product({ cutoutImageKey: null }),
      photos([]),
      { error: null },
    ];

    await deleteProduct({ userId: USER, productId: PID });
    expect(h.removeCalls[0]).toEqual([`${USER}/raw/a.png`]);
  });

  it("output hỏng hoặc thiếu key thì bỏ qua, không ném lỗi", async () => {
    h.responses = [
      product({ cutoutImageKey: null }),
      { data: [{ output: null }, { output: {} }, { output: { key: "" } }] },
      { error: null },
    ];

    await deleteProduct({ userId: USER, productId: PID });
    expect(h.removeCalls[0]).toEqual([`${USER}/raw/a.png`]);
  });

  it("key trùng nhau chỉ xoá một lần", async () => {
    h.responses = [
      product({ cutoutImageKey: `${USER}/raw/a.png` }),
      photos([`${USER}/raw/a.png`]),
      { error: null },
    ];

    await deleteProduct({ userId: USER, productId: PID });
    expect(h.removeCalls[0]).toEqual([`${USER}/raw/a.png`]);
  });

  it("xoá dòng database TRƯỚC rồi mới xoá file", async () => {
    h.responses = [product(), photos([]), { error: null }];

    await deleteProduct({ userId: USER, productId: PID });

    // Ngược thứ tự này: xoá file xong mà xoá dòng hỏng thì còn lại sản phẩm
    // trỏ vào ảnh không tồn tại.
    expect(h.order).toEqual(["delete:products", "removeImages"]);
  });

  it("lệnh xoá cũng lọc userId, không chỉ id", async () => {
    h.responses = [product(), photos([]), { error: null }];

    await deleteProduct({ userId: USER, productId: PID });

    const del = h.queries.find((q) => q.op === "delete");
    expect(del?.filters).toEqual({ id: PID, userId: USER });
  });

  it("chỉ gom ảnh PRODUCT_PHOTO đã thành công", async () => {
    h.responses = [product(), photos([]), { error: null }];

    await deleteProduct({ userId: USER, productId: PID });

    const gen = h.queries.find((q) => q.table === "generations");
    expect(gen?.filters).toEqual({
      productId: PID,
      userId: USER,
      type: "PRODUCT_PHOTO",
      status: "SUCCEEDED",
    });
  });

  it("xoá file lỗi thì báo ra chứ không nuốt", async () => {
    h.responses = [product(), photos([]), { error: null }];
    h.storageResult = { removed: 0, error: "bucket not found" };

    const res = await deleteProduct({ userId: USER, productId: PID });

    // Dòng đã xoá nên không ném lỗi, nhưng phải nói là file chưa dọn được —
    // im lặng ở đây nghĩa là người dùng tưởng đã giải phóng dung lượng.
    expect(res.storageError).toBe("bucket not found");
    expect(res.removedFiles).toBe(0);
  });

  it("xoá dòng lỗi thì ném, và không xoá file", async () => {
    h.responses = [product(), photos([]), { error: { message: "hỏng" } }];

    await expect(
      deleteProduct({ userId: USER, productId: PID }),
    ).rejects.toThrow(/hỏng/);
    expect(h.removeCalls).toEqual([]);
  });

  it("báo đúng số file đã xoá", async () => {
    h.responses = [product(), photos([`${USER}/scene/x/c.png`]), { error: null }];
    h.storageResult = { removed: 3, error: null };

    const res = await deleteProduct({ userId: USER, productId: PID });
    expect(res.removedFiles).toBe(3);
  });
});
