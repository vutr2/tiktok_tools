"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, Field, inputClass } from "@/components/ui";

type Option = { value: string; label: string; emoji: string };

export default function ProfileForm({
  initial,
  industries,
}: {
  initial: { name: string; phone: string; industry: string | null };
  industries: Option[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [industry, setIndustry] = useState(initial.industry);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const dirty =
    name !== initial.name ||
    phone !== initial.phone ||
    industry !== initial.industry;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, industry }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError(body?.error?.message ?? "Lưu không được");
    }
    setSaved(true);
    router.refresh();
  }

  async function signOut() {
    setLeaving(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={save} className="mt-4 space-y-4">
        <Field label="Họ và tên" hint="Để xưng hô, không ảnh hưởng tới kết quả sinh.">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Chị Hoa"
            maxLength={80}
            className={inputClass}
          />
        </Field>

        <Field label="Số điện thoại" hint="Để liên hệ khi có sự cố thanh toán.">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09xx xxx xxx"
            maxLength={20}
            inputMode="tel"
            className={inputClass}
          />
        </Field>

        <div>
          <span className="mb-2 block text-sm font-medium">
            Ngành hàng kinh doanh chính
          </span>
          <div className="flex flex-wrap gap-2">
            {industries.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIndustry(opt.value)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  industry === opt.value
                    ? "border-brand bg-brand-soft text-ink"
                    : "border-line bg-raise text-muted hover:border-dim"
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-dim">
            ℹ️ Đổi ngành chỉ đổi bộ prompt cho những lần sinh sau. Sản phẩm đã
            tạo giữ nguyên ngành cũ.
          </p>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {saved && !dirty ? (
          <p className="text-sm text-emerald-400">Đã lưu.</p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !dirty}
          className={`${buttonClass} w-full py-3 sm:w-auto sm:px-8`}
        >
          {busy ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </form>

      <div className="mt-5">
        <button
          onClick={signOut}
          disabled={leaving}
          className="w-full rounded-xl border border-brand bg-transparent px-4 py-3.5 text-sm font-semibold text-brand transition hover:bg-brand-soft active:scale-[0.99] disabled:opacity-50"
        >
          {leaving ? "Đang thoát..." : "↪ Đăng xuất"}
        </button>
      </div>
    </>
  );
}
