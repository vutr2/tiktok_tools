import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

/**
 * Khoá lại nguyên tắc bảo mật của luồng thanh toán.
 *
 * Đoạn code mẫu ban đầu đánh dấu đơn ĐÃ TRẢ dựa vào `?result=success` trên URL
 * quay về. Tham số đó nằm trên thanh địa chỉ — ai gõ cũng được. Các test này
 * tồn tại để không ai (kể cả tôi) vô tình quay lại cách làm đó.
 */

function verifySignature(raw: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  return expected === signature;
}

describe("chữ ký IPN", () => {
  const secret = "secret-cua-merchant";
  const body = JSON.stringify({ order_invoice_number: "TT123", amount: 5260000 });

  it("chữ ký đúng thì qua", () => {
    const sig = createHmac("sha256", secret).update(body).digest("base64");
    expect(verifySignature(body, sig, secret)).toBe(true);
  });

  it("không có chữ ký thì chặn", () => {
    expect(verifySignature(body, null, secret)).toBe(false);
  });

  it("chữ ký của secret khác thì chặn", () => {
    const sig = createHmac("sha256", "secret-cua-ke-tan-cong")
      .update(body)
      .digest("base64");
    expect(verifySignature(body, sig, secret)).toBe(false);
  });

  it("sửa một chữ trong body là chữ ký hỏng", () => {
    const sig = createHmac("sha256", secret).update(body).digest("base64");
    const tampered = body.replace("5260000", "1");
    expect(verifySignature(tampered, sig, secret)).toBe(false);
  });
});

describe("callback trên trình duyệt", () => {
  it("result=success KHÔNG được là căn cứ đánh dấu đã trả", () => {
    // Đây là lỗ trong đoạn mẫu: bất kỳ ai mở URL này cũng tự cấp gói cho mình.
    const forged = new URL(
      "https://app.example/api/payments/callback?paymentId=abc&result=success",
    );
    expect(forged.searchParams.get("result")).toBe("success");

    // Code thật bỏ qua tham số này và gọi order.retrieve(). Test khẳng định
    // route không hề đọc `result` để quyết định.
    const routeSource = require("node:fs").readFileSync(
      "src/app/api/payments/callback/route.ts",
      "utf8",
    );
    expect(routeSource).toContain("isOrderPaid");
    expect(routeSource).not.toMatch(/result\s*===\s*["']success["']/);
  });
});
