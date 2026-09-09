import Link from "next/link";

type Plan = "FREE" | "LIFETIME";

/**
 * Tiêu đề trang + viên trạng thái quyền dùng.
 *
 * Không còn credit. Viên này chỉ nói hai điều: đã mua gói chưa, và nếu chưa thì
 * còn mấy lượt thử.
 */
export default function PageHeader({
  title,
  plan = "FREE",
  remaining,
  back,
}: {
  title?: string;
  plan?: Plan;
  /** Số lượt dùng thử còn lại. Bỏ qua khi đã mua trọn đời. */
  remaining?: number;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-5">
      {back ? (
        <Link
          href={back.href}
          className="mb-3 inline-block text-sm text-muted transition hover:text-ink"
        >
          ← {back.label}
        </Link>
      ) : null}

      {title ? (
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <PlanPill plan={plan} remaining={remaining} />
        </div>
      ) : null}
    </div>
  );
}

export function PlanPill({
  plan = "FREE",
  remaining,
}: {
  plan?: Plan;
  remaining?: number;
}) {
  const lifetime = plan === "LIFETIME";
  // Hết lượt thì tô đỏ — đây là lúc cần mời mua, không phải lúc thông báo nhẹ.
  const empty = !lifetime && (remaining ?? 0) <= 0;

  return (
    <Link
      href="/app/wallet"
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        lifetime
          ? "border border-brand/40 bg-brand-soft text-ink"
          : empty
            ? "border border-brand bg-brand text-white"
            : "bg-raise text-ink hover:bg-line"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          lifetime ? "bg-brand" : empty ? "bg-white" : "bg-neon"
        }`}
      />
      {lifetime
        ? "Trọn đời"
        : empty
          ? "Hết lượt hôm nay"
          : `Còn ${remaining} lượt hôm nay`}
    </Link>
  );
}
