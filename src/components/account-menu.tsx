"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AccountMenu({
  email,
  industryLabel,
  balance,
}: {
  email: string;
  industryLabel: string | null;
  balance: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Bấm ra ngoài hoặc Esc thì đóng — menu treo lơ lửng là lỗi hay gặp trên mobile.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/signout", { method: "POST" });
    // replace chứ không push: bấm Back không quay lại được màn hình đã đăng nhập.
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand to-neon text-sm font-bold text-white uppercase transition active:scale-95"
        title={email}
      >
        {email.slice(0, 1)}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 origin-top-right animate-rise overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/60"
        >
          <div className="border-b border-line p-4">
            <div className="truncate text-sm font-semibold">{email}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              {industryLabel ? <span>{industryLabel}</span> : null}
              <span className="text-dim">·</span>
              <span className="text-neon">◈ {balance} credit</span>
            </div>
          </div>

          <div className="p-1.5">
            <Link
              href="/app/profile"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm transition hover:bg-raise"
            >
              👤 Hồ sơ
            </Link>
            <Link
              href="/app/wallet"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm transition hover:bg-raise"
            >
              ◈ Ví credit
            </Link>
            <button
              onClick={signOut}
              disabled={busy}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-brand transition hover:bg-brand-soft disabled:opacity-50"
            >
              {busy ? "Đang thoát..." : "↪ Đăng xuất"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
