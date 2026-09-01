"use client";

/**
 * Màn xác thực bằng Descope.
 *
 * AuthProvider chỉ bọc đúng màn này, KHÔNG bọc root layout — các route /app
 * không cần biết Descope tồn tại, và bundle của app không phải gánh SDK.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, Descope } from "@descope/nextjs-sdk";

export default function DescopeAuth({
  projectId,
  baseUrl,
  flowId,
  bonusCredits,
}: {
  projectId: string;
  baseUrl?: string;
  flowId: string;
  bonusCredits: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function exchange() {
    setBusy(true);
    setError(null);
    // Không gửi email lên — server tự đọc từ phiên Descope đã xác minh.
    const res = await fetch("/api/auth/descope", { method: "POST" });
    const body = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      return setError(
        body?.error?.message ?? "Xác thực xong nhưng không vào được app.",
      );
    }
    router.replace(body.needsIndustry ? "/app/onboarding" : "/app");
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-line bg-panel p-5 shadow-2xl shadow-black/40 sm:p-6">
      {/* Cả hai token phải nằm ở cookie thì server mới đọc được:
          DS để xác minh phiên, DSR để gọi me() lấy email đã xác minh. */}
      <AuthProvider
        projectId={projectId}
        baseUrl={baseUrl}
        sessionTokenViaCookie
        refreshTokenViaCookie
      >
        <Descope
          flowId={flowId}
          theme="dark"
          onSuccess={exchange}
          onError={() =>
            setError("Xác thực không thành công. Thử lại giúp tôi.")
          }
        />
      </AuthProvider>

      {busy ? (
        <p className="mt-3 text-center text-sm text-muted">Đang vào studio...</p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-center text-xs text-dim">
        Tài khoản mới được tặng {bonusCredits} credit. Không cần thẻ.
      </p>
    </div>
  );
}
