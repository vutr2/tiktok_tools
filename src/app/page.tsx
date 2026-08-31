import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { INDUSTRIES, INDUSTRY_EMOJI, INDUSTRY_LABEL } from "@/lib/industries";
import { CREDIT_COST, PACKS, formatVnd } from "@/lib/pricing";
import SignInForm from "./sign-in-form";

export default async function Home() {
  if (await currentUserId()) redirect("/app");

  const pack = PACKS[0];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        Ba việc, làm cho tới
      </h1>
      <p className="mt-3 text-[--color-muted]">
        Không quản đơn, không quản kho, không đăng bài hộ. Chỉ ba thứ khiến
        listing của bạn bán được hàng.
      </p>

      <ol className="mt-8 space-y-3">
        {[
          [
            "Ảnh sản phẩm",
            "Chụp bằng điện thoại → tách nền → ghép vào 4 bối cảnh studio dựng riêng cho ngành hàng của bạn.",
          ],
          [
            "Mô tả sàn",
            "Tiêu đề đúng giới hạn ký tự Shopee và TikTok Shop, mô tả, hashtag.",
          ],
          [
            "Kịch bản video 30 giây",
            "5 kịch bản, mỗi cái có hook 3 giây, lời thoại và gợi ý cảnh quay.",
          ],
        ].map(([title, desc], i) => (
          <li
            key={title}
            className="flex gap-4 rounded-xl border border-[--color-line] bg-white p-5"
          >
            <span className="text-lg font-bold text-[--color-brand]">
              {i + 1}
            </span>
            <div>
              <div className="font-semibold">{title}</div>
              <div className="mt-1 text-sm text-[--color-muted]">{desc}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border border-[--color-line] bg-white p-5">
        <div className="font-semibold">Tính tiền thế nào</div>
        <ul className="mt-2 space-y-1 text-sm text-[--color-muted]">
          <li>• {CREDIT_COST.LISTING_COPY} credit = 1 lần sinh mô tả hoặc kịch bản</li>
          <li>
            • {CREDIT_COST.PRODUCT_PHOTO_PER_SCENE} credit = 1 ảnh (chạy đủ 4 bối
            cảnh là {CREDIT_COST.PRODUCT_PHOTO_PER_SCENE * 4} credit)
          </li>
          <li>
            • {pack.name}: {formatVnd(pack.priceVnd)} được {pack.credits} credit
          </li>
          <li>• Sinh lỗi thì credit tự động hoàn lại ví.</li>
        </ul>
      </div>

      <div className="mt-10 rounded-xl border border-[--color-line] bg-white p-6">
        <h2 className="font-semibold">Bắt đầu</h2>
        <p className="mt-1 text-sm text-[--color-muted]">
          Chọn ngành hàng trước — mỗi ngành dùng một bộ prompt và bối cảnh ảnh
          khác nhau, đây là chỗ tạo ra khác biệt.
        </p>
        <SignInForm
          industries={INDUSTRIES.map((i) => ({
            value: i,
            label: INDUSTRY_LABEL[i],
            emoji: INDUSTRY_EMOJI[i],
          }))}
        />
      </div>
    </main>
  );
}
