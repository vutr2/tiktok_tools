import Link from "next/link";

type Plan = "FREE" | "LIFETIME";

/**
 * Tiêu đề trang + viên trạng thái gói.
 *
 * Thiết kế không dùng thanh app cố định: mỗi màn tự mang tiêu đề, và trạng thái
 * gói luôn nằm cạnh — người bán phải thấy mình còn gì trước khi bấm nút nào.
 */
export default function PageHeader({
  title,
  balance,
  plan = "FREE",
  back,
}: {
  title?: string;
  balance: number;
  plan?: Plan;
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
          <CreditPill balance={balance} plan={plan} />
        </div>
      ) : null}
    </div>
  );
}

export function CreditPill({
  balance,
  plan = "FREE",
}: {
  balance: number;
  plan?: Plan;
}) {
  // Người trọn đời không có "số dư" để lo — hiện trạng thái, không hiện con số.
  const lifetime = plan === "LIFETIME";

  return (
    <Link
      href="/app/wallet"
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
        lifetime
          ? "border border-brand/40 bg-brand-soft text-ink"
          : "bg-raise text-ink hover:bg-line"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${lifetime ? "bg-brand" : "bg-neon"}`}
      />
      {lifetime ? "Trọn đời" : `${balance} credit`}
    </Link>
  );
}
