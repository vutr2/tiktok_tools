import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  INDUSTRIES,
  INDUSTRY_EMOJI,
  INDUSTRY_LABEL,
  type Industry,
} from "@/lib/industries";
import { Card } from "@/components/ui";
import PageHeader from "@/components/page-header";
import ProfileForm from "./form";

export default async function ProfilePage() {
  const user = await requireUser();

  const [products, generations, spent] = await Promise.all([
    prisma.product.count({ where: { userId: user.id } }),
    prisma.generation.count({ where: { userId: user.id, status: "SUCCEEDED" } }),
    prisma.creditTransaction.aggregate({
      where: { userId: user.id, type: "DEBIT" },
      _sum: { delta: true },
    }),
  ]);

  const stats: [number, string][] = [
    [products, "Sản phẩm"],
    [generations, "Lần sinh xong"],
    [Math.abs(spent._sum.delta ?? 0), "Credit đã dùng"],
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader title="Tôi" balance={user.wallet?.balance ?? 0} />

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-neon text-2xl font-bold uppercase text-white">
          {user.email.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold">
            {user.name ?? "Chưa đặt tên"}
          </h2>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {stats.map(([value, label]) => (
          <div
            key={label}
            className="rounded-2xl border border-line bg-panel p-3 text-center"
          >
            <div className="text-2xl font-extrabold text-neon tabular-nums">
              {value}
            </div>
            <div className="mt-0.5 text-[11px] leading-tight text-muted">
              {label}
            </div>
          </div>
        ))}
      </div>

      <Card className="mt-5">
        <div className="text-base font-bold">Thông tin tài khoản</div>
        <ProfileForm
          initial={{
            name: user.name ?? "",
            phone: user.phone ?? "",
            industry: (user.industry ?? null) as Industry | null,
          }}
          industries={INDUSTRIES.map((i) => ({
            value: i,
            label: INDUSTRY_LABEL[i],
            emoji: INDUSTRY_EMOJI[i],
          }))}
        />
      </Card>

      <p className="mt-4 text-xs leading-relaxed text-dim">
        Thành viên từ{" "}
        {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(
          user.createdAt,
        )}
        . Đăng nhập bằng email, không có mật khẩu để đổi.
      </p>
    </div>
  );
}
