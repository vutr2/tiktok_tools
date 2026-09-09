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
import { getRefreshToken, getSessionToken } from "@descope/nextjs-sdk/client";

/** Dịch lỗi Descope sang việc cụ thể cần làm, thay vì đọc mã cho người dùng nghe. */
function describeDescopeError(d?: {
  errorCode?: string;
  errorDescription?: string;
  errorMessage?: string;
}): string {
  const detail = d?.errorDescription || d?.errorMessage || "";
  const code = d?.errorCode ?? "";
  const suffix = code || detail ? ` (${[code, detail].filter(Boolean).join(": ")})` : "";

  // Hai nguyên nhân chiếm gần hết số ca khi mới cắm Descope lần đầu.
  if (/redirect|url|origin|domain/i.test(detail + code)) {
    return (
      "Descope chặn địa chỉ này. Vào Descope Console > Project Settings > " +
      `Approved domains, thêm đúng địa chỉ đang mở trong trình duyệt.${suffix}`
    );
  }
  if (/flow|not found|missing/i.test(detail + code)) {
    return (
      "Không chạy được flow. Kiểm tra Descope Console > Flows: flow phải tồn " +
      `tại và đã publish.${suffix}`
    );
  }
  return `Xác thực không thành công${suffix}. Xem thêm ở Console trình duyệt.`;
}

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

  /**
   * Token lấy từ payload của chính sự kiện thành công.
   *
   * Không dùng cookie và không dùng getSessionToken(): cả hai đều là kho lưu
   * trữ, tức luôn có khoảng trễ giữa lúc flow xong và lúc token được ghi vào —
   * `onSuccess` chạy trong khoảng đó thì đọc ra rỗng. Payload thì có sẵn ngay.
   * Vẫn đọc kho làm phương án dự phòng nếu payload thiếu.
   */
  async function exchange(detail?: { sessionJwt?: string; refreshJwt?: string }) {
    setBusy(true);
    setError(null);

    const sessionJwt = detail?.sessionJwt || getSessionToken();
    const refreshJwt = detail?.refreshJwt || getRefreshToken();

    if (!sessionJwt) {
      setBusy(false);
      // Chỉ in TÊN khoá, không in giá trị: payload chứa cả sessionJwt và
      // refreshJwt, đổ nguyên ra console là rải credential vào lịch sử console
      // và vào bất kỳ công cụ giám sát lỗi nào bắt console về sau.
      console.error(
        "[descope] onSuccess không có sessionJwt. Các khoá nhận được:",
        detail ? Object.keys(detail).join(", ") : "(rỗng)",
      );
      return setError(
        "Xác thực xong nhưng Descope không trả về session token. " +
          "Kiểm tra trong Descope Console > Flows: flow phải kết thúc bằng bước " +
          "cấp JWT (Sign In / Sign Up), không phải bước tuỳ chỉnh.",
      );
    }

    // Vẫn KHÔNG gửi email — server tự đọc từ session token đã xác minh chữ ký.
    const res = await fetch("/api/auth/descope", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionJwt}`,
      },
      body: JSON.stringify({ refreshJwt }),
    });
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
      {/* persistTokens là điều kiện tiên quyết: thiếu nó thì hai cờ cookie bên
          dưới bị bỏ qua hoàn toàn và token chỉ nằm trong bộ nhớ. */}
      <AuthProvider
        projectId={projectId}
        baseUrl={baseUrl}
        persistTokens
        sessionTokenViaCookie
        refreshTokenViaCookie
      >
        <Descope
          flowId={flowId}
          theme="dark"
          onSuccess={(e) => exchange(e.detail)}
          onError={(e) => {
            // Đừng nuốt lỗi: Descope nói rõ sai chỗ nào, còn thông báo chung
            // chung thì không ai lần ra được.
            const d = e.detail as
              | { errorCode?: string; errorDescription?: string; errorMessage?: string }
              | undefined;
            console.error("[descope] onError:", d);
            setError(describeDescopeError(d));
          }}
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
        Tài khoản mới được thử {bonusCredits} lượt mỗi ngày. Không cần thẻ.
      </p>
    </div>
  );
}
