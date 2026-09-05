import { createHmac, timingSafeEqual } from "node:crypto";
import { markPaid } from "@/lib/payments";
import { isOrderPaid } from "@/lib/sepay";
import { fail, ok } from "@/lib/http";
import { AppError } from "@/lib/errors";

/**
 * IPN — SePay gọi thẳng vào server khi có biến động thanh toán.
 *
 * Đây là đường CHẮC CHẮN. Callback trên trình duyệt có thể không bao giờ chạy
 * (người dùng đóng tab, mất mạng, chuyển sang app ngân hàng rồi không quay lại).
 *
 * Hai lớp kiểm, cả hai đều cần:
 *   1. Chữ ký HMAC — chứng minh gói tin đến từ SePay, không phải người lạ.
 *   2. `order.retrieve()` — hỏi lại SePay trạng thái thật, phòng khi kẻ tấn công
 *      phát lại (replay) một gói tin cũ hợp lệ.
 */

function verifySignature(raw: string, signature: string | null): boolean {
  const secret = process.env.SEPAY_SECRET_KEY?.trim();
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  // So sánh theo thời gian hằng định: so sánh thường làm lộ dần chữ ký đúng.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const signature =
      req.headers.get("x-sepay-signature") ??
      req.headers.get("x-signature") ??
      null;

    if (!verifySignature(raw, signature)) {
      throw new AppError("BAD_SIGNATURE", "Chữ ký không hợp lệ", 401);
    }

    const body = JSON.parse(raw) as Record<string, unknown>;
    const ref = String(
      body.order_invoice_number ?? body.orderInvoiceNumber ?? "",
    ).trim();
    if (!ref) throw new AppError("REF_REQUIRED", "Thiếu mã đơn", 400);

    // Chữ ký đúng vẫn có thể là gói tin phát lại. Hỏi lại SePay cho chắc.
    const { paid, raw: order } = await isOrderPaid(ref);
    if (!paid) return ok({ ref, applied: false, reason: "chưa thanh toán" });

    const { payment, alreadyPaid } = await markPaid({
      providerRef: ref,
      provider: "sepay",
      raw: order,
    });

    return ok({ ref, applied: !alreadyPaid, status: payment.status });
  } catch (err) {
    return fail(err);
  }
}
