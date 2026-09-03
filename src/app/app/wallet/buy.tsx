"use client";

import { useState } from "react";
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
  const [note, setNote] = useState<string | null>(null);
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
    setNote(json.transferNote);
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

      {note ? (
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
              {note}
            </span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(note);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="shrink-0 text-xs font-medium text-brand transition hover:opacity-80"
            >
              {copied ? "Đã chép ✓" : "Chép nội dung"}
            </button>
          </div>

          <p className="mt-2 text-xs text-dim">
            Credit vào ví ngay sau khi hệ thống nhận được báo có.
          </p>
        </div>
      ) : null}
    </>
  );
}
