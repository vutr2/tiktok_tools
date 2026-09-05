"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui";

type Bank = { name: string; account: string; holder: string };

export default function BuyPack({
  packId,
  packName,
  primary,
  bank,
}: {
  packId: string;
  packName: string;
  primary: boolean;
  bank: Bank;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<{ id: string; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function buy() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId }),
    });
    setBusy(false);
    const json = await res.json().catch(() => null);
    if (!res.ok) return setError(json?.error?.message ?? "Không tạo được đơn");
    // Sang thẳng trang thanh toán — cổng lo phần QR/thẻ/NAPAS.
    router.push(`/app/pay/${json.paymentId}`);
  }

  async function cancel() {
    if (!order) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/payments/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: order.id }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return setError(j?.error?.message ?? "Không huỷ được đơn");
    }
    setOrder(null);
  }

  return (
    <>
      <button
        disabled={busy}
        onClick={buy}
        className={
          primary
            ? `${buttonClass} mt-4 w-full`
            : "mt-4 w-full rounded-xl border border-line bg-raise px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-dim active:scale-[0.98] disabled:opacity-40"
        }
      >
        {busy ? "Đang tạo..." : "Mua ngay"}
      </button>

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

      {order ? (
        <div className="mt-3 rounded-xl border border-line bg-canvas p-3">
          <div className="text-sm font-semibold">
            🏦 Chuyển khoản ngân hàng ({packName})
          </div>
          {bank.account ? (
            <p className="mt-1 text-xs text-muted">
              {bank.name}: <b className="text-ink">{bank.account}</b>
              {bank.holder ? ` (${bank.holder})` : null}
            </p>
          ) : null}

          {/* Nội dung chuyển khoản là thứ duy nhất khớp tiền vào đúng ví — làm
              nổi và cho chép một chạm, gõ tay là sai. */}
          <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-raise px-3 py-2">
            <span className="truncate font-mono text-sm font-semibold text-ink">
              {order.note}
            </span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(order.note);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="shrink-0 text-xs font-medium text-brand transition hover:opacity-80"
            >
              {copied ? "Đã chép ✓" : "Chép nội dung"}
            </button>
          </div>

          <p className="mt-2 text-xs text-dim">
            Gói mở khoá ngay sau khi hệ thống nhận được báo có.
          </p>

          {/* Đổi ý thì phải huỷ được. Đơn treo mãi làm đối soát rối, và lần sau
              tạo đơn mới lại sinh mã chuyển khoản khác. */}
          <button
            onClick={cancel}
            disabled={busy}
            className="mt-3 text-xs font-medium text-muted underline underline-offset-2 transition hover:text-ink disabled:opacity-50"
          >
            {busy ? "Đang huỷ..." : "Huỷ đơn này"}
          </button>
        </div>
      ) : null}
    </>
  );
}
