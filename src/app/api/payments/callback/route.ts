import { NextResponse } from "next/server";
import { markPaid } from "@/lib/payments";
import { isOrderPaid } from "@/lib/sepay";
import { db } from "@/lib/supabase";
import { baseUrl } from "@/lib/sepay";

/**
 * Trình duyệt quay về sau khi rời trang SePay.
 *
 * ⚠ TUYỆT ĐỐI KHÔNG tin tham số `result` trên URL. Nó nằm trên thanh địa chỉ,
 * ai gõ cũng được — tin nó là ai cũng tự cấp cho mình gói trọn đời.
 *
 * Route này chỉ ĐIỀU HƯỚNG. Trạng thái thật lấy bằng `order.retrieve()`, một
 * lời gọi server-to-server ký bằng secret key.
 *
 * Route này cũng KHÔNG phải nguồn duy nhất: người dùng có thể đóng trình duyệt
 * trước khi quay về. IPN (`/api/payments/ipn`) mới là đường chắc chắn.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paymentId") ?? "";
  const go = (path: string) => NextResponse.redirect(`${baseUrl()}${path}`);

  if (!paymentId) return go("/app/wallet");

  const { data: payment } = await db
    .from("payments")
    .select("id,providerRef,status")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment) return go("/app/wallet");
  if (payment.status === "PAID") return go("/app/wallet?paid=1");

  const ref = payment.providerRef;
  if (!ref) return go("/app/wallet");

  try {
    // Hỏi SePay, không hỏi thanh địa chỉ.
    const { paid, raw } = await isOrderPaid(ref);
    if (paid) {
      await markPaid({ providerRef: ref, provider: "sepay", raw });
      return go("/app/wallet?paid=1");
    }
  } catch {
    // Hỏi không được thì cứ đưa người dùng về ví. IPN sẽ chốt sau.
    return go("/app/wallet?pending=1");
  }

  return go("/app/wallet?pending=1");
}
