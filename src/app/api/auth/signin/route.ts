import { signIn, type SignInMode } from "@/lib/auth";
import { isIndustry } from "@/lib/industries";
import { fail, ok } from "@/lib/http";
import { AppError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "");
    const mode: SignInMode = body.mode === "login" ? "login" : "register";

    // Ngành hàng chỉ bắt buộc lúc đăng ký — cả sản phẩm xoay quanh biến này.
    // Người đăng nhập lại đã có ngành rồi, hỏi lại chỉ tổ đổi nhầm.
    if (mode === "register" && !isIndustry(body.industry)) {
      throw new AppError("INDUSTRY_REQUIRED", "Phải chọn ngành hàng", 400);
    }

    const user = await signIn(email, {
      mode,
      industry: isIndustry(body.industry) ? body.industry : undefined,
    });
    return ok({ id: user.id, email: user.email, industry: user.industry });
  } catch (err) {
    return fail(err);
  }
}
