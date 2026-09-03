"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BagIcon,
  PlusCircleIcon,
  UserIcon,
  WalletIcon,
} from "@/components/icons";

const TABS = [
  { href: "/app", label: "Sản phẩm", Icon: BagIcon },
  { href: "/app/new", label: "Thêm", Icon: PlusCircleIcon },
  { href: "/app/wallet", label: "Ví", Icon: WalletIcon },
  { href: "/app/profile", label: "Tôi", Icon: UserIcon },
] as const;

/**
 * Thanh dưới đáy — người bán dùng điện thoại là chính.
 *
 * Client component vì cần biết đang ở trang nào để tô tab tương ứng. Không có
 * dấu hiệu này thì người dùng mất phương hướng giữa bốn màn trông giống nhau.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
      <div className="flex">
        {TABS.map(({ href, label, Icon }) => {
          // /app khớp chính xác, các tab khác khớp cả trang con.
          const active =
            href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition ${
                active ? "text-brand" : "text-dim"
              }`}
            >
              <Icon />
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </Link>
          );
        })}
      </div>
      {/* Vạch home indicator của iPhone */}
      <div className="mx-auto mb-1.5 h-1 w-32 rounded-full bg-line" />
    </nav>
  );
}
