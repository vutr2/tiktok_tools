import { signIn } from "@/lib/auth";
import { isIndustry } from "@/lib/industries";
import { fail, ok } from "@/lib/http";
import { AppError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "");
    const industry = body.industry;

    // Bắt chọn ngành ngay bước đầu — cả sản phẩm xoay quanh biến này.
    if (!isIndustry(industry)) {
      throw new AppError("INDUSTRY_REQUIRED", "Phải chọn ngành hàng", 400);
    }

    const user = await signIn(email, industry);
    return ok({ id: user.id, email: user.email, industry: user.industry });
  } catch (err) {
    return fail(err);
  }
}
