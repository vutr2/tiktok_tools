import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { formatVnd } from "@/lib/pricing";
import { baseUrl, sepay, sepayEnabled } from "@/lib/sepay";
import PageHeader from "@/components/page-header";

export default async function PayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  // Lọc theo userId ngay trong truy vấn: không ai mở được trang trả tiền của
  // đơn người khác.
  const { data: payment } = await db
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("userId", user.id)
    .maybeSingle();

  if (!payment) notFound();
  if (payment.status === "PAID") redirect("/app/wallet?paid=1");
  if (payment.status !== "PENDING") redirect("/app/wallet");

  if (!sepayEnabled()) {
    return (
      <div className="max-w-md">
        <PageHeader title="Thanh toán" plan={user.plan} back={{ href: "/app/wallet", label: "Gói của bạn" }} />
        <div className="rounded-2xl border border-brand/40 bg-brand/5 p-4 text-sm text-brand">
          Chưa cấu hình cổng thanh toán. Đặt <code>SEPAY_MERCHANT_ID</code> và{" "}
          <code>SEPAY_SECRET_KEY</code> trong Environment Variables rồi deploy lại.
        </div>
      </div>
    );
  }

  const client = sepay();
  const back = `${baseUrl()}/api/payments/callback?paymentId=${payment.id}`;

  const fields = client.checkout.initOneTimePaymentFields({
    operation: "PURCHASE",
    // providerRef là mã đơn của mình, cũng là khoá đối soát với SePay.
    order_invoice_number: payment.providerRef ?? payment.id,
    order_amount: payment.amountVnd,
    currency: "VND",
    order_description: `Studio bán hàng — ${payment.packId}`,
    // Ba URL này chỉ để ĐIỀU HƯỚNG. Callback không tin tham số `result`,
    // nó hỏi lại SePay bằng order.retrieve(). Xem src/lib/sepay.ts.
    success_url: `${back}&result=success`,
    error_url: `${back}&result=error`,
    cancel_url: `${back}&result=cancel`,
  });

  return (
    <div className="max-w-md">
      <PageHeader
        title="Thanh toán"
        plan={user.plan}
        back={{ href: "/app/wallet", label: "Gói của bạn" }}
      />

      <div className="rounded-3xl border border-line bg-panel p-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-dim">
            Studio bán hàng
          </p>
          <p className="mt-2 bg-gradient-to-r from-brand to-neon bg-clip-text text-4xl font-extrabold text-transparent">
            {formatVnd(payment.amountVnd)}
          </p>
          <p className="mt-1.5 text-sm text-muted">Gói trọn đời · trả một lần</p>
        </div>

        <div className="mt-5 rounded-xl border border-line bg-raise p-4 text-center text-sm text-muted">
          Bạn sẽ được chuyển sang trang thanh toán của SePay. Hỗ trợ QR Banking,
          thẻ nội địa và NAPAS.
        </div>

        <form action={client.checkout.initCheckoutUrl()} method="POST" className="mt-5">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={String(value)} />
          ))}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-brand to-[#ff5b7f] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition active:scale-[0.98]"
          >
            Thanh toán ngay
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-dim">
          Mã đơn: {payment.providerRef ?? payment.id}
        </p>
      </div>
    </div>
  );
}
