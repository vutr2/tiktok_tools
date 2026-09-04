import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { INDUSTRY_LABEL, type Industry } from "@/lib/industries";
import AccountMenu from "@/components/account-menu";
import BottomNav from "@/components/bottom-nav";

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

  const industryLabel = INDUSTRY_LABEL[user.industry as Industry];

  return (
    <div className="min-h-screen">
      {/* Trên điện thoại không có thanh app: mỗi trang tự mang tiêu đề và số dư,
          đúng như thiết kế. Thanh này chỉ hiện từ sm trở lên. */}
      <header className="sticky top-0 z-40 hidden border-b border-line bg-canvas/80 backdrop-blur-xl sm:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Link href="/app" className="font-bold">
            <span className="bg-gradient-to-r from-brand to-neon bg-clip-text text-transparent">
              Studio bán hàng
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-raise px-3 py-1 text-xs text-muted">
              {industryLabel}
            </span>
            <AccountMenu
              email={user.email}
              industryLabel={industryLabel}
              balance={user.wallet?.balance ?? 0}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6 pb-28">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
