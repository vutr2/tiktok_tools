import { requireUser } from "@/lib/auth";
import { createPayment } from "@/lib/payments";
import { LIFETIME_PLAN } from "@/lib/pricing";
import { fail, ok } from "@/lib/http";

/**
 * Tạo đơn, chưa thanh toán.
 *
 * Client nhận `paymentId` rồi chuyển sang `/app/pay/[id]` — trang đó dựng form
 * đã ký và đẩy sang cổng SePay.
 *
 * Mặc định là gói trọn đời: gói credit đã ngừng bán, để mặc định trỏ vào nó thì
 * gọi không tham số sẽ lỗi PACK_NOT_FOUND.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const payment = await createPayment({
      userId: user.id,
      packId: String(body.packId ?? LIFETIME_PLAN.id),
    });

    return ok(
      {
        paymentId: payment.id,
        amountVnd: payment.amountVnd,
        // Mã đơn gửi sang cổng, cũng là khoá đối soát khi IPN bắn về.
        orderRef: payment.providerRef,
      },
      201,
    );
  } catch (err) {
    return fail(err);
  }
}
