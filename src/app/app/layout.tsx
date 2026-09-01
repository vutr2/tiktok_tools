import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { INDUSTRY_LABEL, type Industry } from "@/lib/industries";
import AccountMenu from "@/components/account-menu";

const NAV: [string, string, string][] = [
  ["/app", "🗂", "Sản phẩm"],
  ["/app/new", "＋", "Thêm"],
  ["/app/wallet", "◈", "Ví"],
  ["/app/profile", "👤", "Tôi"],
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/");
  // Tài khoản tạo qua Descope chưa có ngành hàng — hỏi trước khi cho vào app,
  // vì cả bộ prompt và bối cảnh ảnh phụ thuộc biến này.
  if (!user.industry) redirect("/onboarding");

  const industryLabel = user.industry
    ? INDUSTRY_LABEL[user.industry as Industry]
    : null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/app" className="flex items-center gap-2 font-bold">
            <span className="bg-gradient-to-r from-brand to-neon bg-clip-text text-transparent">
              Studio bán hàng
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {industryLabel ? (
              <span className="hidden rounded-full bg-raise px-3 py-1 text-xs text-muted sm:inline">
                {industryLabel}
              </span>
            ) : null}
            <Link
              href="/app/wallet"
              className="rounded-full border border-line bg-raise px-3 py-1.5 text-xs font-semibold transition hover:border-brand/50"
            >
              ◈ {user.wallet?.balance ?? 0}
            </Link>
            <AccountMenu
              email={user.email}
              industryLabel={industryLabel}
              balance={user.wallet?.balance ?? 0}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6 pb-24 sm:pb-10">
        {children}
      </main>

      {/* Thanh dưới đáy — người bán dùng điện thoại là chính. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 backdrop-blur-xl sm:hidden">
        <div className="flex">
          {NAV.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-0.5 py-3 text-[11px] text-muted transition active:text-ink"
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
