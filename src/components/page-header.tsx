import Link from "next/link";

/**
 * Tiêu đề trang + viên số dư.
 *
 * Thiết kế không dùng thanh app cố định: mỗi màn tự mang tiêu đề của nó, và số
 * dư luôn nằm cạnh — người bán phải thấy mình còn bao nhiêu trước khi bấm bất
 * cứ nút nào tiêu tiền.
 */
export default function PageHeader({
  title,
  balance,
  back,
}: {
  title?: string;
  balance: number;
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
          <CreditPill balance={balance} />
        </div>
      ) : null}
    </div>
  );
}

export function CreditPill({ balance }: { balance: number }) {
  return (
    <Link
      href="/app/wallet"
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-raise px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-line"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-neon" />
      {balance} credit
    </Link>
  );
}
