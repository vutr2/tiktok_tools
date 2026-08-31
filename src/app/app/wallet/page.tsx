import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { activePacks, CREDIT_COST, formatVnd } from "@/lib/pricing";
import { Card } from "@/components/ui";
import BuyPack from "./buy";

export default async function WalletPage() {
  const user = await requireUser();
  const transactions = await prisma.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold">Ví credit</h1>
      <p className="mt-1 text-3xl font-bold">{user.wallet?.balance ?? 0}</p>

      <Card className="mt-6">
        <div className="text-sm font-semibold">Giá</div>
        <ul className="mt-2 space-y-1 text-sm text-[--color-muted]">
          <li>• Mô tả sàn: {CREDIT_COST.LISTING_COPY} credit</li>
          <li>• Kịch bản video: {CREDIT_COST.VIDEO_SCRIPT} credit</li>
          <li>
            • Ảnh sản phẩm: {CREDIT_COST.PRODUCT_PHOTO_PER_SCENE} credit / bối
            cảnh
          </li>
        </ul>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {activePacks().map((pack) => (
          <Card key={pack.id}>
            <div className="font-semibold">{pack.name}</div>
            <div className="mt-1 text-2xl font-bold">
              {formatVnd(pack.priceVnd)}
            </div>
            <div className="text-sm text-[--color-muted]">
              {pack.credits} credit
            </div>
            <BuyPack packId={pack.id} />
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <div className="text-sm font-semibold">Lịch sử</div>
        <ul className="mt-3 divide-y divide-[--color-line] text-sm">
          {transactions.map((t) => (
            <li key={t.id} className="flex justify-between py-2">
              <span>
                <span
                  className={
                    t.delta > 0 ? "text-emerald-700" : "text-[--color-ink]"
                  }
                >
                  {t.delta > 0 ? `+${t.delta}` : t.delta}
                </span>
                <span className="ml-2 text-[--color-muted]">
                  {t.note ?? t.type}
                </span>
              </span>
              <span className="text-[--color-muted]">
                còn {t.balanceAfter}
              </span>
            </li>
          ))}
          {transactions.length === 0 ? (
            <li className="py-2 text-[--color-muted]">Chưa có giao dịch nào.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
