"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui";

type Option = { value: string; label: string; emoji: string; blurb: string };

export default function IndustryPicker({
  industries,
}: {
  industries: Option[];
}) {
  const router = useRouter();
  const [industry, setIndustry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!industry) return setError("Chọn một ngành hàng.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? "Lưu không được");
    }
    router.replace("/app");
    router.refresh();
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3">
        {industries.map((opt) => {
          const on = industry === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setIndustry(opt.value)}
              className={`flex items-center gap-3.5 rounded-2xl border p-3.5 text-left transition ${
                on
                  ? "border-brand bg-brand-soft"
                  : "border-line bg-panel hover:border-dim"
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-raise text-2xl">
                {opt.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold">{opt.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-dim">
                  {opt.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <button
        onClick={save}
        disabled={busy || !industry}
        className={`${buttonClass} mt-6 w-full py-3.5 text-[15px]`}
      >
        {busy ? "Đang lưu..." : "Vào studio →"}
      </button>
    </div>
  );
}
