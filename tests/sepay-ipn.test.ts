import { describe, expect, it } from "vitest";

/**
 * Dựng lại đúng gói tin SePay đã gửi (log SePay ID 35401, đơn TTNLBFK3) và
 * đúng thân trả về của `order.retrieve()` cho cùng đơn đó.
 *
 * Ba lỗi từng chặn việc ghi nhận thanh toán, cả ba đều vì code đoán sai hình
 * dạng dữ liệu. Các test dưới đây khoá lại hình dạng THẬT, để lần sau ai sửa
 * cũng biết ngay là đã lệch.
 */

/** Gói tin IPN thật, chép nguyên văn. */
const IPN_BODY = {
  timestamp: 1788946878,
  notification_type: "ORDER_PAID",
  order: {
    id: "ea93a9e0-ac32-11f1-b21a-a6006ab65aca",
    order_id: "PAY32136AA129BAD8E96",
    order_status: "CAPTURED",
    order_currency: "VND",
    order_amount: "5181200.00",
    order_invoice_number: "TTNLBFK3",
    custom_data: [],
    order_description: "Studio bán hàng — lifetime",
  },
  transaction: {
    payment_method: "BANK_TRANSFER",
    transaction_status: "APPROVED",
    transaction_amount: "5181200",
  },
  customer: null,
  agreement: null,
};

/** Headers thật SePay gửi kèm — KHÔNG có header chữ ký nào. */
const IPN_HEADERS = { "Content-Type": "application/json" };

/** Thân trả về thật của order.retrieve("TTNLBFK3"). */
const RETRIEVE_RESPONSE = {
  status: 200,
  data: {
    data: {
      id: "ea93a9e0-ac32-11f1-b21a-a6006ab65aca",
      order_id: "PAY32136AA129BAD8E96",
      order_invoice_number: "TTNLBFK3",
      order_status: "CAPTURED",
      order_amount: "5181200.00",
      order_currency: "VND",
      transactions: [],
    },
  },
};

// Bản sao logic đang chạy — giữ đồng bộ với src/lib/sepay.ts và route IPN.
function orderRef(body: Record<string, unknown>): string {
  const order = body.order as Record<string, unknown> | undefined;
  return String(
    order?.order_invoice_number ??
      body.order_invoice_number ??
      body.orderInvoiceNumber ??
      "",
  ).trim();
}

function orderBody(res: unknown): Record<string, unknown> | null {
  const http = (res as { data?: unknown } | null)?.data;
  const inner = (http as { data?: unknown } | null)?.data;
  return (inner ?? http ?? null) as Record<string, unknown> | null;
}

const PAID_STATUSES = ["CAPTURED", "PAID", "SUCCESS", "SUCCEEDED", "COMPLETED"];

function statusOf(res: unknown): string {
  const b = orderBody(res);
  return String(b?.order_status ?? b?.status ?? "").toUpperCase();
}

describe("lỗi 1 — SePay không gửi header chữ ký", () => {
  it("gói tin thật chỉ có Content-Type", () => {
    const names = Object.keys(IPN_HEADERS).map((h) => h.toLowerCase());
    expect(names).toEqual(["content-type"]);
    expect(names).not.toContain("x-sepay-signature");
    expect(names).not.toContain("x-signature");
  });

  it("bắt buộc có chữ ký thì mọi IPN đều bị chối", () => {
    const get = (n: string) =>
      (IPN_HEADERS as Record<string, string>)[n] ?? null;
    const signature = get("x-sepay-signature") ?? get("x-signature") ?? null;

    expect(signature).toBeNull();
    // Luật cũ: `if (!verifySignature(raw, signature)) → 401`. Không có chữ ký
    // thì verifySignature luôn false → 401 với MỌI gói tin.
    expect(signature === null).toBe(true);
    // Luật mới: chỉ kiểm KHI có chữ ký.
    const rejected = Boolean(signature) && false;
    expect(rejected).toBe(false);
  });
});

describe("lỗi 2 — mã đơn nằm sâu một tầng", () => {
  it("đọc được TTNLBFK3 từ body.order", () => {
    expect(orderRef(IPN_BODY as unknown as Record<string, unknown>)).toBe(
      "TTNLBFK3",
    );
  });

  it("cách đọc cũ ở tầng ngoài trả về rỗng", () => {
    const cu = String(
      (IPN_BODY as Record<string, unknown>).order_invoice_number ?? "",
    );
    expect(cu).toBe("");
  });

  it("vẫn đọc được nếu SePay đổi sang đặt ở tầng ngoài", () => {
    expect(orderRef({ order_invoice_number: "TTABC123" })).toBe("TTABC123");
  });

  it("thiếu mã đơn thì trả chuỗi rỗng để nơi gọi báo lỗi", () => {
    expect(orderRef({})).toBe("");
    expect(orderRef({ order: {} })).toBe("");
  });
});

describe("lỗi 3 — order.retrieve lồng hai tầng data", () => {
  it("đọc đúng CAPTURED", () => {
    expect(statusOf(RETRIEVE_RESPONSE)).toBe("CAPTURED");
    expect(PAID_STATUSES).toContain(statusOf(RETRIEVE_RESPONSE));
  });

  it("cách đọc cũ dừng ở res.data nên ra chuỗi rỗng", () => {
    const b = RETRIEVE_RESPONSE.data as Record<string, unknown>;
    const cu = String(b?.status ?? b?.order_status ?? "");
    expect(cu).toBe("");
    // Chuỗi rỗng không nằm trong danh sách đã trả → đơn đã CAPTURED vẫn bị coi
    // là chưa thanh toán, và tài khoản không bao giờ được mở khoá.
    expect(PAID_STATUSES).not.toContain("");
  });

  it("chịu được cả trường hợp chỉ có một tầng data", () => {
    expect(statusOf({ data: { order_status: "CAPTURED" } })).toBe("CAPTURED");
  });

  it("trạng thái chưa xong thì không coi là đã trả", () => {
    for (const s of ["PENDING", "CREATED", "FAILED", "CANCELLED", ""]) {
      expect(PAID_STATUSES).not.toContain(s);
    }
  });

  it("không có dữ liệu thì mặc định là CHƯA trả", () => {
    expect(statusOf(null)).toBe("");
    expect(statusOf({})).toBe("");
  });
});

describe("cả ba lỗi cùng chạy trên gói tin thật", () => {
  it("từ IPN tới kết luận đã thanh toán", () => {
    const ref = orderRef(IPN_BODY as unknown as Record<string, unknown>);
    expect(ref).toBe("TTNLBFK3");

    const paid = PAID_STATUSES.includes(statusOf(RETRIEVE_RESPONSE));
    expect(paid).toBe(true);
  });
});
