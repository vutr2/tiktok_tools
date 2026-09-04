import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  activePacks,
  CREDIT_COST,
  DEFAULT_PACK_ID,
  formatVnd,
  LIFETIME_PLAN,
  lifetimePriceVnd,
} from "@/lib/pricing";
import { Card } from "@/components/ui";
import PageHeader from "@/components/page-header";
import BuyPack from "./buy";

const USAGE: [string, string][] = [
  ["📝", "Viết mô tả sàn"],
  ["🎬", "Lên kịch bản video"],
  ["📸", "Dựng ảnh bối cảnh"],
];

export default async function WalletPage() {
  const user = await requireUser();
  const balance = user.wallet?.balance ?? 0;
  const lifetime = user.plan === "LIFETIME";

  const transactions = await prisma.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const bank = {
    name: process.env.BANK_NAME ?? "",
    account: process.env.BANK_ACCOUNT ?? "",
    holder: process.env.BANK_HOLDER ?? "",
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Gói của bạn" balance={balance} plan={user.plan} />

      {lifetime ? (
        <>
          <div className="rounded-3xl border border-brand/50 bg-brand-soft/40 p-6 text-center">
            <div className="text-4xl">♾️</div>
            <p className="mt-3 bg-gradient-to-r from-brand to-neon bg-clip-text text-2xl font-extrabold text-transparent">
              Gói trọn đời
            </p>
            <p className="mt-1.5 text-sm text-muted">
              Dùng không giới hạn — ảnh, mô tả, kịch bản. Không tính credit.
            </p>
            {user.planActivatedAt ? (
              <p className="mt-3 text-xs text-dim">
                Kích hoạt{" "}
                {new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(
                  user.planActivatedAt,
                )}
              </p>
            ) : null}
          </div>

          <Card className="mt-5">
            <div className="text-base font-bold">Bạn dùng được gì</div>
            <ul className="mt-3 space-y-2.5 text-sm">
              {USAGE.map(([icon, label]) => (
                <li key={label} className="flex items-center justify-between gap-3">
                  <span className="text-muted">
                    {icon} {label}
                  </span>
                  <span className="shrink-0 font-semibold text-neon">
                    Không giới hạn
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <>
          <div className="rounded-3xl border border-brand bg-brand-soft/40 p-6 text-center">
            <span className="inline-block rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white">
              Trả một lần
            </span>
            <p className="mt-3 text-xl font-bold">{LIFETIME_PLAN.name}</p>
            <p className="mt-1 bg-gradient-to-r from-brand to-neon bg-clip-text text-4xl font-extrabold text-transparent">
              ${LIFETIME_PLAN.priceUsd}
            </p>
            <p className="mt-1 text-sm text-muted">
              ≈ {formatVnd(lifetimePriceVnd())}
            </p>
            <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
              {LIFETIME_PLAN.blurb}
            </p>
            <BuyPack
              packId={LIFETIME_PLAN.id}
              packName={LIFETIME_PLAN.name}
              primary
              bank={bank}
            />
          </div>

          <Card className="mt-5">
            <div className="text-base font-bold">Trọn đời gồm những gì</div>
            <ul className="mt-3 space-y-2.5 text-sm">
              {USAGE.map(([icon, label]) => (
                <li key={label} className="flex items-center justify-between gap-3">
                  <span className="text-muted">
                    {icon} {label}
                  </span>
                  <span className="shrink-0 font-semibold text-neon">
                    Không giới hạn
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {balance > 0 ? (
            <Card className="mt-5">
              <div className="text-sm font-semibold">
                Credit còn lại: {balance}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Dùng bình thường cho tới khi hết. Mỗi ảnh{" "}
                {CREDIT_COST.PRODUCT_PHOTO_PER_SCENE} credit, mỗi lần sinh text{" "}
                {CREDIT_COST.LISTING_COPY} credit.
              </p>
            </Card>
          ) : null}

          {/* Gói credit đã ngừng bán — chỉ hiện nếu bật lại trong pricing.ts */}
          {activePacks().length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {activePacks().map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-2xl border border-line bg-panel p-4"
                >
                  <div className="font-bold">{pack.name}</div>
                  <div className="mt-1 text-2xl font-extrabold text-brand">
                    +{pack.credits} credit
                  </div>
                  <div className="mt-0.5 text-xs text-dim">
                    ~ {formatVnd(Math.round(pack.priceVnd / pack.credits))} / credit
                  </div>
                  <BuyPack
                    packId={pack.id}
                    packName={pack.name}
                    primary={pack.id === DEFAULT_PACK_ID}
                    bank={bank}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}

      <Card className="mt-6">
        <div className="text-base font-bold">Lịch sử giao dịch</div>
        <ul className="mt-3 divide-y divide-line text-sm">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`w-12 shrink-0 font-semibold tabular-nums ${
                  t.delta > 0 ? "text-neon" : "text-ink"
                }`}
              >
                {t.delta > 0 ? `+${t.delta}` : t.delta}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted">
                {t.note ?? t.type}
              </span>
              <span className="shrink-0 text-dim tabular-nums">
                còn {t.balanceAfter}
              </span>
            </li>
          ))}
          {transactions.length === 0 ? (
            <li className="py-2 text-muted">Chưa có giao dịch nào.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
