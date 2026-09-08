import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { pgDateRequired } from "@/lib/dates";
import { signedUrls } from "@/lib/storage";
import { INDUSTRY_LABEL, type Industry } from "@/lib/industries";
import { buttonClass } from "@/components/ui";
import { getEntitlement } from "@/lib/entitlement";
import PageHeader from "@/components/page-header";

/** Thời gian tương đối — người bán quan tâm "vừa xong" hơn là ngày giờ đầy đủ. */
function relativeTime(d: Date): string {
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 5) return "Vừa tạo xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(d);
}

export default async function Dashboard() {
  const user = await requireUser();
  const ent = await getEntitlement(user.id);
  const products =
    (
      await db
        .from("products")
        .select("*")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(30)
    ).data ?? [];

  // Ký một lần cho cả lưới. Ký từng ảnh là N lần gọi mạng nối tiếp.
  const urls = await signedUrls(
    products.map((p) => p.cutoutImageKey ?? p.originalImageKey),
  );

  return (
    <div>
      <PageHeader
        title="Sản phẩm"
        plan={user.plan}
        remaining={ent.remaining}
      />

      {products.length === 0 ? (
        // Thiết kế đặt khối này NGAY DƯỚI tiêu đề, không căn giữa theo chiều
        // dọc. Lần trước tôi tự căn giữa cho đỡ trống — đó là ý tôi, không phải
        // của thiết kế.
        <div className="mx-auto max-w-md rounded-3xl border border-dashed border-line p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-raise text-2xl">
            📸
          </div>
          <p className="mt-4 font-semibold">Chưa có sản phẩm nào</p>
          <p className="mx-auto mt-1.5 max-w-[17rem] text-sm text-muted">
            Chụp một tấm bằng điện thoại, đặt trên nền trơn. Phần studio để máy
            lo.
          </p>
          <Link href="/app/new" className={`${buttonClass} mt-6 w-full py-3`}>
            ✨ Bắt đầu
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/app/p/${p.id}`}
                  className="group block overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-brand/50"
                >
                  <div className="relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urls.get(p.cutoutImageKey ?? p.originalImageKey) ?? ""}
                      alt={p.name}
                      className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    {/* Chip ngành đè lên ảnh — nhận ra ngay không cần đọc chữ dưới */}
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-ink backdrop-blur-sm">
                      {INDUSTRY_LABEL[p.industry as Industry]}
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-semibold">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-xs text-dim">
                      {relativeTime(pgDateRequired(p.createdAt))}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex justify-center">
            <Link href="/app/new" className={`${buttonClass} px-6 py-3`}>
              ＋ Thêm sản phẩm
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
