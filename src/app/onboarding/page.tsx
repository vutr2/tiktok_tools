import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  INDUSTRIES,
  INDUSTRY_EMOJI,
  INDUSTRY_LABEL,
} from "@/lib/industries";
import IndustryPicker from "./picker";

/**
 * Bước chọn ngành hàng sau khi Descope xác thực xong.
 *
 * Nằm NGOÀI /app có chủ đích: /app/layout đẩy về đây khi chưa có ngành, để
 * trong /app thì vòng lặp chuyển hướng là không thể xảy ra.
 */
export default async function Onboarding() {
  // currentUser + redirect, KHÔNG requireUser: đây là trang, chưa đăng nhập thì
  // phải đá về màn đăng nhập chứ không phải ném lỗi 500.
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.industry) redirect("/app");

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-neon text-2xl shadow-lg shadow-brand/25">
          👋
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
          Bạn bán ngành gì?
        </h1>
        <p className="mt-2 text-sm text-muted">
          Mỗi ngành một bộ prompt, giọng bán và bối cảnh ảnh riêng — đây là chỗ
          tạo ra khác biệt. Đổi lại sau trong Hồ sơ.
        </p>
      </div>

      <IndustryPicker
        industries={INDUSTRIES.map((i) => ({
          value: i,
          label: INDUSTRY_LABEL[i],
          emoji: INDUSTRY_EMOJI[i],
        }))}
      />
    </main>
  );
}
