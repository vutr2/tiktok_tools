"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, inputClass } from "@/components/ui";

type Option = { value: string; label: string; emoji: string };
type Mode = "login" | "register";

export default function SignInForm({
  industries,
  bonusCredits,
}: {
  industries: Option[];
  bonusCredits: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState<string | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  // Lỗi "email đã có" / "chưa có tài khoản" thì cho bấm một phát sang tab kia,
  // khỏi bắt người ta gõ lại email.
  const switchTo: Mode | null =
    error?.code === "EMAIL_TAKEN"
      ? "login"
      : error?.code === "NO_ACCOUNT"
        ? "register"
        : null;

  function pickMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "register" && !industry) {
      return setError({
        code: "INDUSTRY_REQUIRED",
        message: "Chọn ngành hàng trước đã.",
      });
    }

    setBusy(true);
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, mode, industry }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return setError({
        code: body?.error?.code ?? "UNKNOWN",
        message: body?.error?.message ?? "Không vào được, thử lại giúp tôi.",
      });
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-line bg-panel p-5 shadow-2xl shadow-black/40 sm:p-6">
      {/* Hai tab, tách bạch để gõ nhầm email không tạo tài khoản rỗng */}
      <div className="flex gap-1 rounded-2xl bg-raise p-1">
        {(
          [
            ["register", "Đăng ký"],
            ["login", "Đăng nhập"],
          ] as [Mode, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => pickMode(key)}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              mode === key
                ? "bg-gradient-to-r from-brand to-[#ff5b7f] text-white shadow-lg shadow-brand/25"
                : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Email của bạn</span>
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@cua-ban.com"
            className={inputClass}
          />
        </label>

        {mode === "register" ? (
          <div className="animate-rise">
            <span className="mb-2 block text-sm font-medium">
              Ngành hàng kinh doanh chính
            </span>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {industries.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIndustry(opt.value)}
                  className={`rounded-xl border px-2 py-3 text-xs transition ${
                    industry === opt.value
                      ? "border-brand bg-brand-soft font-semibold text-ink"
                      : "border-line bg-raise text-muted hover:border-dim"
                  }`}
                >
                  <span className="block text-xl">{opt.emoji}</span>
                  <span className="mt-1 block leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-dim">
              Mỗi ngành một bộ prompt và bối cảnh ảnh riêng. Đổi sau được.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
            {error.message}
            {switchTo ? (
              <button
                type="button"
                onClick={() => pickMode(switchTo)}
                className="mt-2 block font-semibold text-neon underline underline-offset-2"
              >
                → Chuyển sang {switchTo === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className={`${buttonClass} w-full py-3`}
        >
          {busy
            ? "Đang xử lý..."
            : mode === "register"
              ? `Tạo tài khoản — tặng ${bonusCredits} credit`
              : "Vào studio"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-dim">
        {mode === "register"
          ? "Không cần mật khẩu, không cần thẻ. Bắt đầu bằng email là đủ."
          : "Dùng đúng email đã đăng ký để thấy lại sản phẩm cũ."}
      </p>
    </div>
  );
}
