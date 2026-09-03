import { signInVerified } from "@/lib/auth";
import { verifiedIdentityFromDescope } from "@/lib/descope";
import { fail, ok } from "@/lib/http";

/**
 * Đổi phiên Descope lấy phiên của app.
 *
 * KHÔNG nhận email từ body — nếu tin body thì ai cũng POST email người khác vào
 * là chiếm được tài khoản. Email chỉ lấy từ phiên Descope đã xác minh phía server:
 * session token đi qua header `Authorization`, được kiểm chữ ký với JWKS của Descope.
 *
 * Refresh token thì nhận từ body được, vì nó chỉ dùng để hỏi Descope "người này
 * là ai" — tự bịa một cái thì Descope từ chối ngay.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const refreshJwt =
      typeof body?.refreshJwt === "string" ? body.refreshJwt : undefined;

    const identity = await verifiedIdentityFromDescope(refreshJwt);
    const { user, isNew } = await signInVerified(identity);

    return ok({
      id: user.id,
      email: user.email,
      industry: user.industry,
      isNew,
      needsIndustry: user.industry === null,
    });
  } catch (err) {
    return fail(err);
  }
}
