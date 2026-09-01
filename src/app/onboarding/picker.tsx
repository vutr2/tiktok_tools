"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui";

type Option = { value: string; label: string; emoji: string };

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
    <div className="rounded-3xl border border-line bg-panel p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {industries.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setIndustry(opt.value)}
            className={`rounded-xl border px-2 py-4 text-xs transition ${
              industry === opt.value
                ? "border-brand bg-brand-soft font-semibold text-ink"
                : "border-line bg-raise text-muted hover:border-dim"
            }`}
          >
            <span className="block text-2xl">{opt.emoji}</span>
            <span className="mt-1.5 block leading-tight">{opt.label}</span>
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <button
        onClick={save}
        disabled={busy || !industry}
        className={`${buttonClass} mt-5 w-full py-3`}
      >
        {busy ? "Đang lưu..." : "Vào studio →"}
      </button>
    </div>
  );
}
