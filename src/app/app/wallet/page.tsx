import { requireUser } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlement";
import { formatVnd, LIFETIME_PLAN, lifetimePriceVnd } from "@/lib/pricing";
import { Card } from "@/components/ui";
import PageHeader from "@/components/page-header";
import BuyPack from "./buy";

const INCLUDED: [string, string][] = [
  ["📸", "Dựng ảnh bối cảnh studio"],
  ["📝", "Viết mô tả sàn"],
  ["🎬", "Lên kịch bản video 30 giây"],
];

export default async function WalletPage() {
  const user = await requireUser();
  const ent = await getEntitlement(user.id);

  const bank = {
    name: process.env.BANK_NAME ?? "",
    account: process.env.BANK_ACCOUNT ?? "",
    holder: process.env.BANK_HOLDER ?? "",
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Gói của bạn"
        plan={user.plan}
        remaining={ent.remaining}
      />

      {ent.unlimited ? (
        <div className="rounded-3xl border border-brand/50 bg-brand-soft/40 p-6 text-center">
          <div className="text-4xl">♾️</div>
          <p className="mt-3 bg-gradient-to-r from-brand to-neon bg-clip-text text-2xl font-extrabold text-transparent">
            Gói trọn đời
          </p>
          <p className="mt-1.5 text-sm text-muted">
            Dùng không giới hạn. Không đếm lượt, không hết hạn.
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
      ) : (
        <>
          {/* Lượt thử còn lại — thanh này là thứ khiến người bán quyết định mua */}
          <Card className={ent.remaining <= 0 ? "border-brand" : ""}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold">
                {ent.remaining > 0 ? "Lượt dùng thử" : "Đã hết lượt dùng thử"}
              </span>
              <span className="text-sm tabular-nums text-muted">
                {ent.used}/{ent.limit}
              </span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-raise">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-neon"
                style={{
                  width: `${Math.min(100, (ent.used / ent.limit) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2.5 text-xs text-muted">
              {ent.remaining > 0
                ? `Còn ${ent.remaining} lượt. Đủ dựng trọn vẹn một sản phẩm để xem thử kết quả.`
                : "Mua gói trọn đời để tiếp tục dùng không giới hạn."}
            </p>
          </Card>

          <div className="mt-5 rounded-3xl border border-brand bg-brand-soft/40 p-6 text-center">
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
        </>
      )}

      <Card className="mt-5">
        <div className="text-base font-bold">
          {ent.unlimited ? "Bạn dùng được gì" : "Trọn đời gồm những gì"}
        </div>
        <ul className="mt-3 space-y-2.5 text-sm">
          {INCLUDED.map(([icon, label]) => (
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
    </div>
  );
}
