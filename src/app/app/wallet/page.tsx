import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  activePacks,
  CREDIT_COST,
  DEFAULT_PACK_ID,
  formatVnd,
} from "@/lib/pricing";
import { Card } from "@/components/ui";
import PageHeader from "@/components/page-header";
import BuyPack from "./buy";

const USAGE: [string, string, string][] = [
  ["📝", "Viết mô tả sàn", `${CREDIT_COST.LISTING_COPY} credit`],
  ["🎬", "Lên kịch bản video", `${CREDIT_COST.VIDEO_SCRIPT} credit`],
  ["📸", "Dựng ảnh bối cảnh", `${CREDIT_COST.PRODUCT_PHOTO_PER_SCENE} / bối cảnh credit`],
];

export default async function WalletPage() {
  const user = await requireUser();
  const balance = user.wallet?.balance ?? 0;
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
      <PageHeader title="Ví Credit" balance={balance} />

      <div className="py-4 text-center">
        <p className="bg-gradient-to-r from-brand to-neon bg-clip-text text-6xl font-extrabold leading-none text-transparent">
          {balance}
        </p>
        <p className="mt-2 text-sm text-muted">credit khả dụng</p>
      </div>

      <Card className="mt-4">
        <div className="text-base font-bold">Bảng tiêu hao credit</div>
        <ul className="mt-3 space-y-2.5 text-sm">
          {USAGE.map(([icon, label, cost]) => (
            <li key={label} className="flex items-center justify-between gap-3">
              <span className="text-muted">
                {icon} {label}
              </span>
              <span className="shrink-0 font-semibold text-neon">{cost}</span>
            </li>
          ))}
        </ul>
      </Card>

      <h2 className="mt-6 text-base font-bold">Nạp thêm credit</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {activePacks().map((pack) => {
          const primary = pack.id === DEFAULT_PACK_ID;
          return (
            <div
              key={pack.id}
              className={`rounded-2xl border p-4 ${
                primary ? "border-brand bg-brand-soft/40" : "border-line bg-panel"
              }`}
            >
              {pack.badge ? (
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    primary
                      ? "bg-brand text-white"
                      : "border border-line text-muted"
                  }`}
                >
                  {pack.badge}
                </span>
              ) : null}
              <div className="mt-2.5 font-bold">{pack.name}</div>
              <div className="mt-1 text-2xl font-extrabold text-brand">
                +{pack.credits} credit
              </div>
              <div className="mt-0.5 text-xs text-dim">
                ~ {formatVnd(Math.round(pack.priceVnd / pack.credits))} / credit
              </div>
              <BuyPack
                packId={pack.id}
                packName={pack.name}
                primary={primary}
                bank={bank}
              />
            </div>
          );
        })}
      </div>

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
