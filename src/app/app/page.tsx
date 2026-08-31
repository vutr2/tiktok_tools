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
        <h1 className="text-xl font-bold">Sản phẩm của bạn</h1>
        <Link href="/app/new" className={buttonClass}>
          + Thêm sản phẩm
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-[--color-line] p-10 text-center text-sm text-[--color-muted]">
          Chưa có sản phẩm nào. Chụp một tấm bằng điện thoại rồi tải lên.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/app/p/${p.id}`}
                className="block overflow-hidden rounded-xl border border-[--color-line] bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicUrl(p.cutoutImageKey ?? p.originalImageKey)}
                  alt={p.name}
                  className="aspect-square w-full object-cover"
                />
                <div className="p-3">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-[--color-muted]">
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
