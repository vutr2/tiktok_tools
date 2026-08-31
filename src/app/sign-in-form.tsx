"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass } from "@/components/ui";

type Option = { value: string; label: string; emoji: string };

export default function SignInForm({ industries }: { industries: Option[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!industry) return setError("Chọn ngành hàng trước đã.");

    setBusy(true);
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, industry }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? "Đăng nhập không được");
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {industries.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setIndustry(opt.value)}
            className={`rounded-lg border px-3 py-3 text-sm ${
              industry === opt.value
                ? "border-[--color-brand] bg-[--color-brand-soft] font-semibold"
                : "border-[--color-line] bg-white"
            }`}
          >
            <div className="text-lg">{opt.emoji}</div>
            {opt.label}
          </button>
        ))}
      </div>

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@cua-ban.com"
        className={inputClass}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button type="submit" disabled={busy} className={buttonClass}>
        {busy ? "Đang vào..." : "Vào dùng thử"}
      </button>
    </form>
  );
}
