import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import {
  INDUSTRIES,
  INDUSTRY_BLURB,
  INDUSTRY_EMOJI,
  INDUSTRY_LABEL,
} from "@/lib/industries";
import { FREE_TRIAL_GENERATIONS } from "@/lib/pricing";
import { PlanPill } from "@/components/page-header";
import IndustryPicker from "./picker";

/**
 * Bước chọn ngành hàng sau khi xác thực xong.
 *
 * Nằm NGOÀI /app có chủ đích: /app/layout đẩy về đây khi chưa có ngành, để
 * trong /app thì vòng lặp chuyển hướng là không thể xảy ra.
 */
export default async function Onboarding() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.industry) redirect("/app");

  return (
    <main className="mx-auto min-h-svh max-w-md px-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Bắt đầu</h1>
        <PlanPill plan={user.plan} remaining={FREE_TRIAL_GENERATIONS} />
      </div>

      <h2 className="mt-6 text-2xl font-bold tracking-tight">
        Bạn bán ngành gì?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Mỗi ngành một bộ prompt, giọng bán và bối cảnh ảnh riêng — đây là chỗ tạo
        ra khác biệt. Đổi lại sau trong Hồ sơ.
      </p>

      <IndustryPicker
        industries={INDUSTRIES.map((i) => ({
          value: i,
          label: INDUSTRY_LABEL[i],
          emoji: INDUSTRY_EMOJI[i],
          blurb: INDUSTRY_BLURB[i],
        }))}
      />
    </main>
  );
}
