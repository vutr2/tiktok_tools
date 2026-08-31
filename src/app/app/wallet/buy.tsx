"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui";

export default function BuyPack({ packId }: { packId: string }) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-4">
      <button
        disabled={busy}
        className={buttonClass}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packId }),
          });
          setBusy(false);
          const json = await res.json();
          setNote(res.ok ? json.transferNote : (json?.error?.message ?? "Lỗi"));
        }}
      >
        {busy ? "Đang tạo..." : "Mua"}
      </button>

      {note ? (
        <div className="mt-3 rounded-lg bg-neutral-100 p-3 text-sm">
          Chuyển khoản với nội dung: <b>{note}</b>
          <div className="mt-1 text-xs text-[--color-muted]">
            Credit vào ví ngay sau khi hệ thống nhận được báo có.
          </div>
        </div>
      ) : null}
    </div>
  );
}
