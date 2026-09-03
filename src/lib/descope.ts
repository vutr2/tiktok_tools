/**
 * Descope làm cửa trước.
 *
 * Descope chỉ lo phần xác thực: nó chứng minh người bấm nút đúng là chủ của
 * email đó. Xong việc, app tự phát phiên `tt_session` của mình và mọi thứ phía
 * sau (ví credit, sản phẩm, sổ cái) chạy y như cũ trên bảng `users` của ta.
 *
 * Cố ý KHÔNG để Descope quản phiên: `user.id` là khoá ngoại của cả sổ tiền,
 * đổi nguồn phiên là đụng vào mọi route.
 *
 * Chưa cấu hình Descope thì `descopeEnabled()` trả false và app quay về đăng
 * nhập bằng email như trước — không ai bị chặn ngoài cửa vì thiếu biến môi trường.
 */

import { cookies } from "next/headers";
import { session, createSdk } from "@descope/nextjs-sdk/server";
import descopeSdk from "@descope/node-sdk";
import { AppError } from "./errors";

export type VerifiedIdentity = {
  email: string;
  name?: string;
  phone?: string;
};

export function descopeProjectId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID?.trim();
  return id ? id : undefined;
}

export function descopeBaseUrl(): string | undefined {
  const u = process.env.NEXT_PUBLIC_DESCOPE_BASE_URL?.trim();
  return u ? u : undefined;
}

export function descopeEnabled(): boolean {
  return descopeProjectId() !== undefined;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

/**
 * Đọc phiên Descope từ cookie, trả về email ĐÃ XÁC MINH.
 *
 * Email lấy theo hai đường vì claim trong session token tuỳ cấu hình project:
 *   1. claim `email` ngay trong token — không tốn thêm request.
 *   2. `sdk.me(refreshJwt)` — chỉ cần Project ID, không cần Management Key.
 *
 * Bắt buộc `verifiedEmail === true`. Đây là lý do dùng Descope: email chưa xác
 * minh mà vẫn cho vào thì ai cũng đăng ký hộ người khác và ăn credit tặng.
 */
export async function verifiedIdentityFromDescope(
  /**
   * Refresh token client gửi kèm. Cookie DSR chỉ tồn tại khi AuthProvider bật
   * `persistTokens`; nhận thẳng từ client thì không phụ thuộc vào chuyện đó nữa.
   */
  refreshJwtFromClient?: string,
): Promise<VerifiedIdentity> {
  const projectId = descopeProjectId();
  if (!projectId) {
    throw new AppError("DESCOPE_OFF", "Chưa bật Descope trên server", 503);
  }

  const baseUrl = descopeBaseUrl();
  // session() ưu tiên header `Authorization: Bearer` rồi mới tới cookie DS.
  // Client gửi thẳng token nên không cần cookie hoạt động.
  const info = await session({ projectId, baseUrl });
  if (!info) {
    throw new AppError(
      "DESCOPE_NO_SESSION",
      "Không đọc được phiên Descope. Thử xác thực lại.",
      401,
    );
  }

  const claimEmail = asString(info.token.email);
  const claimVerified = info.token.email_verified;

  if (claimEmail && claimVerified === true) {
    return {
      email: claimEmail,
      name: asString(info.token.name),
      phone: asString(info.token.phone_number),
    };
  }

  // Token không mang email (hoặc chưa rõ đã xác minh) — hỏi thẳng Descope.
  // `me()` nhận REFRESH token (cookie DSR), không phải session JWT.
  //
  // Ưu tiên cookie hơn body: cookie do trình duyệt gắn, body do client tự đặt.
  const refreshJwt =
    (await cookies()).get(descopeSdk.RefreshTokenCookieName)?.value ??
    refreshJwtFromClient;
  if (!refreshJwt) {
    throw new AppError(
      "DESCOPE_NO_REFRESH",
      "Không có refresh token của Descope (cả từ client lẫn cookie DSR).",
      401,
    );
  }

  const sdk = createSdk({ projectId, baseUrl });
  const me = await sdk.me(refreshJwt);
  const user = me.data;

  if (!me.ok || !user) {
    throw new AppError(
      "DESCOPE_NO_USER",
      "Descope không trả về thông tin người dùng.",
      502,
    );
  }

  // CHỐT CHẶN: refresh token đến từ client nên phải chứng minh nó thuộc về đúng
  // người mà session token đã xác minh. Thiếu bước này, kẻ tấn công đăng nhập
  // bằng tài khoản của mình rồi đính refresh token của nạn nhân vào body là
  // chiếm được phiên của nạn nhân — session token hợp lệ trở thành vô nghĩa.
  if (user.userId !== info.token.sub) {
    throw new AppError(
      "IDENTITY_MISMATCH",
      "Phiên và refresh token không thuộc cùng một tài khoản.",
      401,
    );
  }

  const email = asString(user.email);
  if (!email) {
    throw new AppError(
      "DESCOPE_NO_EMAIL",
      "Tài khoản Descope này chưa gắn email. Bật phương thức đăng nhập bằng email trong Descope Console.",
      400,
    );
  }
  if (user.verifiedEmail !== true) {
    throw new AppError(
      "EMAIL_NOT_VERIFIED",
      "Email chưa được xác minh. Mở link/nhập mã Descope gửi tới hộp thư của bạn.",
      403,
    );
  }

  return {
    email,
    name: asString(user.name),
    phone: asString(user.phone),
  };
}
