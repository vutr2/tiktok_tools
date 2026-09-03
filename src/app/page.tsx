import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { INDUSTRIES, INDUSTRY_EMOJI, INDUSTRY_LABEL } from "@/lib/industries";
import { CREDIT_COST, PACKS, formatVnd } from "@/lib/pricing";
import {
  descopeBaseUrl,
  descopeEnabled,
  descopeFlowId,
  descopeProjectId,
} from "@/lib/descope";
import SignInForm from "./sign-in-form";
import DescopeAuth from "./descope-auth";

const STEPS: [string, string, string][] = [
  [
    "✨",
    "Ảnh studio",
    "Ảnh chụp điện thoại → tách nền → ghép vào 4 bối cảnh dựng riêng theo ngành. Vẫn đúng sản phẩm của bạn, không bị vẽ lại thành cái khác.",
  ],
  [
    "📝",
    "Mô tả sàn",
    "Tiêu đề cắt đúng 120 ký tự Shopee, 255 của TikTok Shop — cắt bằng code chứ không tin model tự đếm. Kèm soát cụm từ dễ bị gỡ listing.",
  ],
  [
    "🎬",
    "Kịch bản chạy được",
    "5 kịch bản 30 giây, xem thử ngay trong khung điện thoại dọc: chữ nhảy đúng giây, chạy trên chính ảnh studio bạn vừa dựng.",
  ],
];

export default async function Home() {
  if (await currentUserId()) redirect("/app");

  const pack = PACKS[0];
  const bonus = Number(process.env.SIGNUP_BONUS_CREDITS ?? 10);

  return (
    <main>
      {/* Màn đầu tiên là ô đăng nhập — không bắt cuộn qua quảng cáo mới vào được */}
      <section className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-neon text-2xl shadow-lg shadow-brand/25">
            ✨
          </div>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight">
            Studio bán hàng
          </h1>
          <p className="mt-2 text-sm text-muted">
            Ảnh chụp ở bàn bếp,{" "}
            <span className="bg-gradient-to-r from-brand to-neon bg-clip-text font-semibold text-transparent">
              lên sàn như ảnh studio.
            </span>
          </p>
        </div>

        {descopeEnabled() && !descopeFlowId() ? (
          <div className="rounded-2xl border border-brand/40 bg-brand/5 p-4 text-sm text-brand">
            Thiếu <code>NEXT_PUBLIC_DESCOPE_FLOW_ID</code>. Đặt biến này trong
            Environment Variables rồi deploy lại — biến NEXT_PUBLIC_ được nhúng
            cứng lúc build nên thêm không thôi chưa đủ.
          </div>
        ) : descopeEnabled() ? (
          <DescopeAuth
            projectId={descopeProjectId() as string}
            baseUrl={descopeBaseUrl()}
            flowId={descopeFlowId() as string}
            bonusCredits={bonus}
          />
        ) : (
          <SignInForm
            bonusCredits={bonus}
            industries={INDUSTRIES.map((i) => ({
              value: i,
              label: INDUSTRY_LABEL[i],
              emoji: INDUSTRY_EMOJI[i],
            }))}
          />
        )}

        <a
          href="#app-lam-gi"
          className="mt-8 text-center text-xs text-dim transition hover:text-muted"
        >
          App làm được gì ↓
        </a>
      </section>

      {/* Phần giải thích nằm dưới, ai muốn đọc thì cuộn */}
      <section
        id="app-lam-gi"
        className="mx-auto max-w-3xl scroll-mt-6 px-5 pb-16"
      >
        <h2 className="text-xl font-bold tracking-tight">Ba việc, làm cho tới</h2>
        <p className="mt-2 text-sm text-muted">
          Không quản đơn, không quản kho, không đăng bài hộ — chỉ ba thứ quyết
          định listing của bạn có bán được hàng hay không.
        </p>

        <div className="mt-6 space-y-3">
          {STEPS.map(([icon, title, desc], i) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-line bg-panel p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-raise text-lg">
                {icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-dim">0{i + 1}</span>
                  <span className="font-semibold">{title}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
          <div className="font-semibold">Tính tiền thế nào</div>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            <li>
              <span className="text-ink">
                {CREDIT_COST.LISTING_COPY} credit
              </span>{" "}
              — một lần sinh mô tả hoặc kịch bản
            </li>
            <li>
              <span className="text-ink">
                {CREDIT_COST.PRODUCT_PHOTO_PER_SCENE} credit
              </span>{" "}
              — một ảnh (đủ 4 bối cảnh là{" "}
              {CREDIT_COST.PRODUCT_PHOTO_PER_SCENE * 4})
            </li>
            <li>
              <span className="text-ink">{pack.name}</span> —{" "}
              {formatVnd(pack.priceVnd)} được {pack.credits} credit
            </li>
            <li className="text-neon">
              Sinh lỗi thì credit tự động hoàn lại ví.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
