export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-panel p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "error" | "ok" | "brand";
}) {
  const tones = {
    neutral: "bg-raise text-muted",
    warn: "bg-amber-500/15 text-amber-300",
    error: "bg-red-500/15 text-red-300",
    ok: "bg-emerald-500/15 text-emerald-300",
    brand: "bg-brand/15 text-brand",
  } as const;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-raise px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-dim focus:border-brand/60 focus:ring-2 focus:ring-brand/20";

/** Nút chính. Gradient TikTok — chỉ dùng cho hành động chính của màn hình. */
export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-[#ff5b7f] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none";

export const buttonGhostClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-raise px-4 py-2.5 text-sm font-medium text-ink transition hover:border-dim active:scale-[0.98] disabled:opacity-40";

/** Khối chờ — dùng khi đang gọi provider, để chỗ trống không trông như lỗi. */
export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-xl bg-[linear-gradient(90deg,var(--color-raise)_25%,var(--color-line)_50%,var(--color-raise)_75%)] bg-[length:200%_100%] ${className}`}
    />
  );
}
