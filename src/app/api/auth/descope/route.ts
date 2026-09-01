import { signInVerified } from "@/lib/auth";
import { verifiedIdentityFromDescope } from "@/lib/descope";
import { fail, ok } from "@/lib/http";

/**
 * Đổi phiên Descope lấy phiên của app.
 *
 * Không nhận email từ body — nếu tin body thì ai cũng POST email người khác vào
 * là chiếm được tài khoản. Email chỉ lấy từ phiên Descope đã xác minh phía server.
 */
export async function POST() {
  try {
    const identity = await verifiedIdentityFromDescope();
    const { user, isNew } = await signInVerified(identity);
    return ok({
      id: user.id,
      email: user.email,
      industry: user.industry,
      isNew,
      // Chưa chọn ngành thì client đưa sang bước chọn ngành.
      needsIndustry: user.industry === null,
    });
  } catch (err) {
    return fail(err);
  }
}
