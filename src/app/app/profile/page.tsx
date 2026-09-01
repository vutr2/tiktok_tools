import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  INDUSTRIES,
  INDUSTRY_EMOJI,
  INDUSTRY_LABEL,
  type Industry,
} from "@/lib/industries";
import { Card } from "@/components/ui";
import ProfileForm from "./form";

export default async function ProfilePage() {
  const user = await requireUser();

  const [products, generations, spent] = await Promise.all([
    prisma.product.count({ where: { userId: user.id } }),
    prisma.generation.count({
      where: { userId: user.id, status: "SUCCEEDED" },
    }),
    prisma.creditTransaction.aggregate({
      where: { userId: user.id, type: "DEBIT" },
      _sum: { delta: true },
    }),
  ]);

  const used = Math.abs(spent._sum.delta ?? 0);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-neon text-2xl font-bold uppercase text-white">
          {user.email.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">
            {user.name ?? "Chưa đặt tên"}
          </h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ["Sản phẩm", products],
          ["Lần sinh xong", generations],
          ["Credit đã dùng", used],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-2xl border border-line bg-panel p-4 text-center"
          >
            <div className="text-2xl font-bold">{value as number}</div>
            <div className="mt-0.5 text-xs text-muted">{label as string}</div>
          </div>
        ))}
      </div>

      <Card className="mt-6">
        <div className="text-sm font-semibold">Thông tin</div>
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

      <p className="mt-4 text-xs text-dim">
        Thành viên từ{" "}
        {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(
          user.createdAt,
        )}
        . Đăng nhập bằng email, không có mật khẩu để đổi.
      </p>
    </div>
  );
}
