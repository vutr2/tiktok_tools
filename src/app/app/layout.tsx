import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { INDUSTRY_LABEL, type Industry } from "@/lib/industries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/");

  return (
    <div>
      <header className="border-b border-[--color-line] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/app" className="font-semibold">
            Bộ công cụ bán hàng
          </Link>
          <div className="flex items-center gap-4 text-sm">
            {user.industry ? (
              <span className="text-[--color-muted]">
                {INDUSTRY_LABEL[user.industry as Industry]}
              </span>
            ) : null}
            <Link href="/app/wallet" className="font-medium">
              {user.wallet?.balance ?? 0} credit
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
