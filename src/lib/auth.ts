/**
 * Auth tối giản: JWT trong cookie httpOnly, không cần bảng session (giữ đúng 6 bảng).
 *
 * MVP đăng nhập bằng email, không mật khẩu — đủ để chạy thử với người bán thật.
 * Trước khi mở public: thêm OTP SMS/Zalo. Việc đó KHÔNG thêm bảng nào, chỉ thêm
 * một bước xác thực trước khi phát cookie.
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";
import { credit, ensureWallet } from "./credits";
import { AppError } from "./errors";
import type { Industry } from "@prisma/client";

const COOKIE = "tt_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET phải có tối thiểu 32 ký tự");
  }
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

  let user = await prisma.user.findUnique({ where: { email: normalized } });
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
    user = await prisma.user.create({
      data: { email: normalized, industry: opts.industry },
    });
  } else if (opts.industry && user.industry !== opts.industry) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { industry: opts.industry },
    });
  }

  await ensureWallet(user.id);
  await grantSignupBonus(user.id, isNew);
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
 * bước sau (`/app/onboarding`). Ép hỏi trước sẽ vỡ khi flow là magic link mở ở
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

  const existing = await prisma.user.findUnique({ where: { email } });
  const isNew = !existing;

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          // Chỉ điền vào chỗ còn trống, không đè lên thứ người dùng tự sửa.
          name: existing.name ?? identity.name ?? null,
          phone: existing.phone ?? identity.phone ?? null,
        },
      })
    : await prisma.user.create({
        data: { email, name: identity.name, phone: identity.phone },
      });

  await ensureWallet(user.id);
  await grantSignupBonus(user.id, isNew);
  await issueSession(user.id);
  return { user, isNew };
}

/** Tặng credit đúng một lần cho tài khoản mới. Idempotent theo userId. */
async function grantSignupBonus(userId: string, isNew: boolean) {
  if (!isNew) return;
  const bonus = Number(process.env.SIGNUP_BONUS_CREDITS ?? 10);
  if (bonus <= 0) return;
  await credit({
    userId,
    amount: bonus,
    type: "BONUS",
    idempotencyKey: `bonus:signup:${userId}`,
    note: "Tặng khi đăng ký",
  });
}

/** Phát cookie phiên của app. Đây là nguồn phiên duy nhất, kể cả khi dùng Descope. */
async function issueSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

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
  jar.delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function currentUser() {
  const id = await currentUserId();
  if (!id) return null;
  return prisma.user.findUnique({ where: { id }, include: { wallet: true } });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Chưa đăng nhập", 401);
  return user;
}
