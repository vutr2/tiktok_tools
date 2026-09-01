import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { INDUSTRY_LABEL, type Industry } from "@/lib/industries";
import { buttonClass } from "@/components/ui";

export default async function Dashboard() {
  const user = await requireUser();
  const products = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Sản phẩm</h1>
        <Link href="/app/new" className={`${buttonClass} hidden sm:inline-flex`}>
          ＋ Thêm sản phẩm
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-line bg-panel p-10 text-center">
          <div className="text-4xl">📷</div>
          <p className="mt-4 font-semibold">Chưa có sản phẩm nào</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
            Chụp một tấm bằng điện thoại, đặt trên nền trơn. Phần studio để máy
            lo.
          </p>
          <Link href="/app/new" className={`${buttonClass} mt-6`}>
            ✨ Bắt đầu
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/app/p/${p.id}`}
                className="group block overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-brand/50"
              >
                <div className="relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicUrl(p.cutoutImageKey ?? p.originalImageKey)}
                    alt={p.name}
                    className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-dim">
                    {INDUSTRY_LABEL[p.industry as Industry]}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
