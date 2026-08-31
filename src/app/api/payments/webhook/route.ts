/**
 * Webhook xác nhận đã nhận tiền.
 *
 * MVP: dùng cho công cụ đọc SMS/biến động số dư ngân hàng bắn vào, hoặc gọi tay
 * khi đối soát. Bảo vệ bằng một secret dùng chung — đủ cho giai đoạn này, nhưng
 * PHẢI đổi sang chữ ký của cổng thanh toán trước khi có lượng đơn thật.
 */

import { markPaid } from "@/lib/payments";
import { fail, ok } from "@/lib/http";
import { AppError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      throw new AppError("NOT_CONFIGURED", "Chưa cấu hình PAYMENT_WEBHOOK_SECRET", 503);
    }
    if (req.headers.get("x-webhook-secret") !== secret) {
      throw new AppError("FORBIDDEN", "Sai secret", 403);
    }

    const body = await req.json();
    const providerRef = String(body.transferNote ?? body.providerRef ?? "").trim();
    if (!providerRef) {
      throw new AppError("REF_REQUIRED", "Thiếu nội dung chuyển khoản");
    }

    const { payment, alreadyPaid } = await markPaid({ providerRef, raw: body });
    return ok({ paymentId: payment.id, status: payment.status, alreadyPaid });
  } catch (err) {
    return fail(err);
  }
}
