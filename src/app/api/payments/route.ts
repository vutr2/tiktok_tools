import { requireUser } from "@/lib/auth";
import { createPayment } from "@/lib/payments";
import { DEFAULT_PACK_ID } from "@/lib/pricing";
import { fail, ok } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const payment = await createPayment({
      userId: user.id,
      packId: String(body.packId ?? DEFAULT_PACK_ID),
    });

    return ok(
      {
        paymentId: payment.id,
        amountVnd: payment.amountVnd,
        credits: payment.credits,
        // Người dùng chuyển khoản với đúng nội dung này, đối soát bằng nó.
        transferNote: payment.providerRef,
      },
      201,
    );
  } catch (err) {
    return fail(err);
  }
}
