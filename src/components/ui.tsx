export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[--color-line] bg-white p-5 ${className}`}
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
  tone?: "neutral" | "warn" | "error" | "ok";
}) {
  const tones = {
    neutral: "bg-neutral-100 text-neutral-700",
    warn: "bg-amber-100 text-amber-800",
    error: "bg-red-100 text-red-800",
    ok: "bg-emerald-100 text-emerald-800",
  } as const;
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
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
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-[--color-muted]">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-[--color-line] bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400";

export const buttonClass =
  "rounded-lg bg-[--color-brand] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

export const buttonGhostClass =
  "rounded-lg border border-[--color-line] bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";
