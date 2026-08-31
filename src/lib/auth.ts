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

export async function signIn(email: string, industry?: Industry) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError("INVALID_EMAIL", "Email không hợp lệ");
  }

  let user = await prisma.user.findUnique({ where: { email: normalized } });
  const isNew = !user;

  if (!user) {
    user = await prisma.user.create({ data: { email: normalized, industry } });
  } else if (industry && user.industry !== industry) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { industry },
    });
  }

  await ensureWallet(user.id);

  if (isNew) {
    const bonus = Number(process.env.SIGNUP_BONUS_CREDITS ?? 10);
    if (bonus > 0) {
      await credit({
        userId: user.id,
        amount: bonus,
        type: "BONUS",
        idempotencyKey: `bonus:signup:${user.id}`,
        note: "Tặng khi đăng ký",
      });
    }
  }

  const token = await new SignJWT({ sub: user.id })
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

  return user;
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
