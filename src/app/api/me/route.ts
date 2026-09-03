import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isIndustry } from "@/lib/industries";
import { AppError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";

/** Giới hạn để một field bị dán cả quyển sách không phình bảng users. */
const MAX_NAME = 80;
const MAX_PHONE = 20;

function clean(v: unknown, max: number, label: string): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  if (s.length > max) {
    throw new AppError("TOO_LONG", `${label} tối đa ${max} ký tự`, 400);
  }
  return s;
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();

    // Đổi ngành là đổi cả bộ prompt và bối cảnh ảnh của các lần sinh SAU.
    // Sản phẩm đã tạo giữ nguyên ngành cũ — cố ý, để kết quả cũ không đổi nghĩa.
    if (body.industry !== undefined && !isIndustry(body.industry)) {
      throw new AppError("INVALID_INDUSTRY", "Ngành hàng không hợp lệ", 400);
    }

    // PATCH: chỉ đụng vào trường CÓ trong body.
    // Trước đây `clean(undefined)` trả null nên một PATCH chỉ gửi {industry}
    // (đúng thứ màn chọn ngành gửi) sẽ xoá trắng tên và số điện thoại đã lưu.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.name !== undefined
          ? { name: clean(body.name, MAX_NAME, "Tên") }
          : {}),
        ...(body.phone !== undefined
          ? { phone: clean(body.phone, MAX_PHONE, "Số điện thoại") }
          : {}),
        ...(body.industry !== undefined ? { industry: body.industry } : {}),
      },
    });

    return ok({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      industry: updated.industry,
    });
  } catch (err) {
    return fail(err);
  }
}
