"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonGhostClass } from "@/components/ui";

/**
 * Xoá sản phẩm — hành động KHÔNG hoàn tác được.
 *
 * Hai bước, không phải một. Nút này nằm cùng màn hình với các nút sinh ảnh;
 * một cú chạm nhầm trên điện thoại mà mất luôn cả bộ ảnh studio đã sinh thì
 * không có đường lấy lại. Bước xác nhận nói rõ mất những gì.
 *
 * Dùng xác nhận nội tuyến chứ không phải `window.confirm`: hộp thoại của trình
 * duyệt không theo giao diện tối của app, và một số webview chặn nó.
 */
export default function DeleteProduct({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Không xoá được sản phẩm");
      }

      // replace chứ không push: sản phẩm không còn, bấm Back quay lại trang
      // 404 là trải nghiệm khó hiểu.
      router.replace("/app");
      // Danh sách sản phẩm render phía server — không refresh thì sản phẩm vừa
      // xoá vẫn còn trong bộ nhớ đệm của router.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <div className="mt-10 border-t border-line pt-6">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`${buttonGhostClass} w-full text-red-300 hover:border-red-500/50 sm:w-auto`}
        >
          🗑 Xoá sản phẩm
        </button>
        <p className="mt-2 text-xs text-dim">
          Xoá sản phẩm và toàn bộ ảnh của nó để giải phóng dung lượng.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-2xl border border-red-500/40 bg-red-500/5 p-5">
      <p className="font-semibold text-red-200">
        Xoá vĩnh viễn “{productName}”?
      </p>
      <p className="mt-1.5 text-sm text-muted">
        Ảnh gốc, ảnh đã tách nền và mọi ảnh bối cảnh đã sinh sẽ bị xoá khỏi kho.
        Không khôi phục được.
      </p>
      <p className="mt-1.5 text-sm text-muted">
        Lượt dùng đã tiêu không được hoàn lại.
      </p>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "Đang xoá…" : "Xoá vĩnh viễn"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={busy}
          className={buttonGhostClass}
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}
