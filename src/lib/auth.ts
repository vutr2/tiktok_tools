/**
 * Auth tối giản: JWT trong cookie httpOnly, không cần bảng session (giữ đúng 6 bảng).
 *
 * MVP đăng nhập bằng email, không mật khẩu — đủ để chạy thử với người bán thật.
 * Trước khi mở public: thêm OTP SMS/Zalo. Việc đó KHÔNG thêm bảng nào, chỉ thêm
 * một bước xác thực trước khi phát cookie.
 */

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db, unwrap } from "./supabase";
import { newId } from "./ids";
import { pgDate, pgDateRequired } from "./dates";
import { AppError } from "./errors";
import type { Industry } from "./industries";

const COOKIE = "tt_session";
const MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Khoá ký phiên.
 *
 * Ném AppError chứ không phải Error trần: Error trần lọt ra ngoài thành 500 kèm
 * stack, người dùng thấy một trang vỡ còn người vận hành không biết sửa ở đâu.
 * Phân biệt "chưa đặt" với "đặt rồi nhưng ngắn" vì hai thứ sửa khác nhau.
 */
export const AUTH_SECRET_MIN = 32;

/** Tách riêng để test được: `secret()` chỉ chạy trong request scope của Next. */
export function checkAuthSecret(s: string | undefined): asserts s is string {
  if (!s) {
    throw new AppError(
      "AUTH_SECRET_MISSING",
      "Chưa đặt AUTH_SECRET.\n" +
        "  • Máy cá nhân: thêm vào .env.\n" +
        "  • Vercel/hosting: thêm vào Environment Variables (tick cả Production " +
        "lẫn Preview) rồi DEPLOY LẠI — biến mới không tự áp vào bản deploy cũ.\n" +
        "  Tạo chuỗi: openssl rand -base64 48",
      503,
    );
  }
  if (s.length < AUTH_SECRET_MIN) {
    throw new AppError(
      "AUTH_SECRET_TOO_SHORT",
      `AUTH_SECRET chỉ dài ${s.length} ký tự, cần tối thiểu ${AUTH_SECRET_MIN}. ` +
        "Tạo chuỗi mới: openssl rand -base64 48",
      503,
    );
  }
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  checkAuthSecret(s);
  return new TextEncoder().encode(s);
}

export type SignInMode = "login" | "register";

/**
 * Đăng nhập / đăng ký.
 *
 * Hai chế độ tách bạch có chủ đích. Gộp làm một thì gõ nhầm email lúc đăng nhập
 * sẽ lặng lẽ tạo một tài khoản mới rỗng — người bán tưởng mất sạch sản phẩm,
 * còn ta thì đẻ ra tài khoản rác kèm credit tặng.
 */
export async function signIn(
  email: string,
  opts: { mode: SignInMode; industry?: Industry },
) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError("INVALID_EMAIL", "Email không hợp lệ");
  }

  let user = (
    await db.from("users").select("*").eq("email", normalized).maybeSingle()
  ).data;
  const isNew = !user;

  if (opts.mode === "login" && !user) {
    throw new AppError(
      "NO_ACCOUNT",
      "Chưa có tài khoản nào dùng email này. Chuyển sang tab Đăng ký.",
      404,
    );
  }
  if (opts.mode === "register" && user) {
    throw new AppError(
      "EMAIL_TAKEN",
      "Email này đã có tài khoản. Chuyển sang tab Đăng nhập.",
      409,
    );
  }

  if (!user) {
    user = unwrap(
      await db
        .from("users")
        .insert({
          id: newId(),
          email: normalized,
          industry: opts.industry ?? null,
          updatedAt: new Date().toISOString(),
        })
        .select("*")
        .single(),
      "tạo tài khoản",
    );
  } else if (opts.industry && user.industry !== opts.industry) {
    user = unwrap(
      await db
        .from("users")
        .update({ industry: opts.industry, updatedAt: new Date().toISOString() })
        .eq("id", user.id)
        .select("*")
        .single(),
      "cập nhật ngành hàng",
    );
  }
  if (!user) throw new AppError("USER_FAILED", "Không tạo được tài khoản", 500);

  await issueSession(user.id);
  return user;
}

/**
 * Đăng nhập bằng email ĐÃ được nhà cung cấp ngoài xác minh (Descope).
 *
 * Không có bước login/register tách đôi ở đây: Descope đã chứng minh người bấm
 * nút là chủ hộp thư, nên có sẵn tài khoản thì vào, chưa có thì tạo. Cái bẫy
 * "gõ nhầm email tạo tài khoản rỗng" biến mất vì email không còn do người dùng
 * tự khai.
 *
 * `industry` để trống có chủ đích — Descope không biết ngành hàng, app hỏi ở
 * bước sau (`/onboarding`). Ép hỏi trước sẽ vỡ khi flow là magic link mở ở
 * tab khác.
 */
export async function signInVerified(identity: {
  email: string;
  name?: string;
  phone?: string;
}) {
  const email = identity.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError("INVALID_EMAIL", "Email không hợp lệ");
  }

  const existing = (
    await db.from("users").select("*").eq("email", email).maybeSingle()
  ).data;
  const isNew = !existing;

  const user = existing
    ? unwrap(
        await db
          .from("users")
          .update({
            // Chỉ điền vào chỗ còn trống, không đè lên thứ người dùng tự sửa.
            name: existing.name ?? identity.name ?? null,
            phone: existing.phone ?? identity.phone ?? null,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("*")
          .single(),
        "cập nhật tài khoản",
      )
    : unwrap(
        await db
          .from("users")
          .insert({
            id: newId(),
            email,
            name: identity.name ?? null,
            phone: identity.phone ?? null,
            updatedAt: new Date().toISOString(),
          })
          .select("*")
          .single(),
        "tạo tài khoản",
      );
  if (!user) throw new AppError("USER_FAILED", "Không tạo được tài khoản", 500);

  await issueSession(user.id);
  return { user, isNew };
}


/**
 * Lưu HASH của token, không lưu token thô.
 *
 * Rò rỉ database thì kẻ lấy được bảng `sessions` cũng không dựng lại được phiên
 * nào — họ có hash, không có token.
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Bao lâu mới ghi lại lastSeenAt. Ghi mỗi request là một lượt UPDATE mỗi lần tải trang. */
const TOUCH_EVERY_MS = 5 * 60_000;

/**
 * Phát cookie phiên của app, và ghi một dòng `sessions` đi kèm.
 *
 * Dòng đó là thứ khiến "đăng xuất" có thật: JWT một mình không thu hồi được,
 * bị đánh cắp là dùng tới lúc hết hạn và không ai chặn nổi.
 */
async function issueSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  const h = await headers();
  unwrap(
    await db.from("sessions").insert({
      id: newId(),
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + MAX_AGE * 1000).toISOString(),
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      // Sau proxy/CDN thì IP thật nằm ở x-forwarded-for, lấy phần tử đầu.
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    }),
    "tạo phiên",
  );

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  // Thu hồi phía server TRƯỚC khi xoá cookie: xoá cookie chỉ làm trình duyệt
  // quên token, bản sao đã bị đánh cắp thì vẫn dùng được.
  if (token) {
    await db
      .from("sessions")
      .update({ revokedAt: new Date().toISOString() })
      .eq("tokenHash", hashToken(token))
      .is("revokedAt", null);
  }
  jar.delete(COOKIE);
}

/** Đăng xuất khỏi MỌI thiết bị. Dùng khi nghi tài khoản bị chiếm. */
export async function revokeAllSessions(userId: string) {
  const res = await db
    .from("sessions")
    .update({ revokedAt: new Date().toISOString() })
    .eq("userId", userId)
    .is("revokedAt", null)
    .select("id");
  return (res.data ?? []).length;
}

export async function currentUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    // 1. Chữ ký hợp lệ và chưa hết hạn theo chính JWT.
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;

    // 2. Phiên còn sống theo server. Đây là bước JWT một mình không làm được:
    //    thêm một truy vấn mỗi request, đổi lấy khả năng thu hồi.
    const { data: session } = await db
      .from("sessions")
      .select("id,userId,revokedAt,expiresAt,lastSeenAt")
      .eq("tokenHash", hashToken(token))
      .maybeSingle();

    if (
      !session ||
      session.revokedAt ||
      pgDateRequired(session.expiresAt) <= new Date()
    ) {
      return null;
    }

    if (
      Date.now() - pgDateRequired(session.lastSeenAt).getTime() >
      TOUCH_EVERY_MS
    ) {
      await db
        .from("sessions")
        .update({ lastSeenAt: new Date().toISOString() })
        .eq("id", session.id);
    }

    return session.userId;
  } catch {
    return null;
  }
}

export async function currentUser() {
  const id = await currentUserId();
  if (!id) return null;
  const { data: user } = await db
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!user) return null;

  // Prisma include -> hai truy vấn. Ví là quan hệ 1-1 nên rẻ.
  const { data: wallet } = await db
    .from("credit_wallet")
    .select("*")
    .eq("userId", id)
    .maybeSingle();

  // supabase-js trả chuỗi ISO, Prisma từng trả Date. Đổi ngay tại đây để mọi
  // nơi gọi (định dạng ngày, so sánh) không phải sửa theo.
  return {
    ...user,
    wallet,
    createdAt: pgDateRequired(user.createdAt),
    updatedAt: pgDateRequired(user.updatedAt),
    planActivatedAt: pgDate(user.planActivatedAt),
  };
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Chưa đăng nhập", 401);
  return user;
}
