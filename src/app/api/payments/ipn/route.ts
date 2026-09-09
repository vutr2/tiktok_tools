import { createHmac, timingSafeEqual } from "node:crypto";
import { markPaid } from "@/lib/payments";
import { isOrderPaid } from "@/lib/sepay";
import { fail, ok } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { cleanEnv } from "@/lib/env-value";

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
  // cleanEnv, không phải trim: dấu nháy còn sót lại đổi hẳn secret, và mọi IPN
  // sẽ bị chối với BAD_SIGNATURE — nhìn log y hệt như đang bị tấn công.
  const secret = cleanEnv(process.env.SEPAY_SECRET_KEY);
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(raw).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  // So sánh theo thời gian hằng định: so sánh thường làm lộ dần chữ ký đúng.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Lấy mã đơn ra khỏi gói tin.
 *
 * SePay lồng nó MỘT TẦNG: `{ order: { order_invoice_number } }` — xác nhận
 * bằng gói tin thật (log SePay ID 35401). Code cũ chỉ tìm ở tầng ngoài nên dù
 * qua được bước chữ ký cũng sẽ chết ở REF_REQUIRED.
 */
function orderRef(body: Record<string, unknown>): string {
  const order = body.order as Record<string, unknown> | undefined;
  return String(
    order?.order_invoice_number ??
      body.order_invoice_number ??
      body.orderInvoiceNumber ??
      "",
  ).trim();
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const signature =
      req.headers.get("x-sepay-signature") ??
      req.headers.get("x-signature") ??
      null;

    /**
     * Chữ ký là TUỲ CHỌN, không bắt buộc.
     *
     * SePay không gửi header chữ ký nào cả — gói tin thật chỉ có
     * `Content-Type: application/json`. Bắt buộc phải có chữ ký nghĩa là chối
     * sạch mọi IPN với 401, đúng những gì đã xảy ra: tiền đã vào (CAPTURED,
     * APPROVED) mà tài khoản không được mở khoá.
     *
     * Bỏ bước này KHÔNG làm yếu hệ thống, vì gói tin IPN chưa bao giờ là nguồn
     * sự thật. Nó chỉ dùng để lấy MÃ ĐƠN; còn "đã trả tiền chưa" luôn hỏi lại
     * SePay bằng `order.retrieve()` — lời gọi server-to-server ký bằng secret
     * key. Kẻ lạ có bắn IPN giả cũng chỉ khiến ta đi hỏi SePay về một mã đơn,
     * và mã đơn nào cũng đã gắn sẵn với đúng một người dùng trong bảng payments.
     *
     * Vẫn kiểm NẾU có chữ ký: hôm nào SePay bật tính năng đó thì lớp bảo vệ tự
     * có hiệu lực, không phải sửa code.
     */
    if (signature && !verifySignature(raw, signature)) {
      throw new AppError("BAD_SIGNATURE", "Chữ ký không hợp lệ", 401);
    }

    const body = JSON.parse(raw) as Record<string, unknown>;
    const ref = orderRef(body);
    if (!ref) throw new AppError("REF_REQUIRED", "Thiếu mã đơn", 400);

    // Đây mới là bước xác thực thật: hỏi SePay bằng kênh đã ký, không tin gói
    // tin vừa nhận. Cũng chặn luôn kiểu phát lại gói tin cũ.
    const { paid, status, raw: order } = await isOrderPaid(ref);
    // Trả kèm status: lần trước mất nhiều thời gian vì không biết SePay đang
    // nói trạng thái gì.
    if (!paid) return ok({ ref, applied: false, status, reason: "chưa thanh toán" });

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
