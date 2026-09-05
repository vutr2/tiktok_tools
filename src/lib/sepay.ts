import "server-only";
import { SePayPgClient } from "sepay-pg-node";

/**
 * Cổng thanh toán SePay.
 *
 * ⚠ ĐIỀU QUAN TRỌNG NHẤT VỀ LUỒNG NÀY:
 *
 * `success_url` / `error_url` / `cancel_url` là **chuyển hướng trình duyệt**.
 * Người dùng — hay bất kỳ ai — gõ thẳng được URL đó. Nếu đánh dấu đơn ĐÃ TRẢ
 * dựa vào tham số `result=success` trên URL thì ai cũng tự cấp cho mình gói
 * trọn đời bằng một dòng địa chỉ.
 *
 * Nên callback chỉ dùng để ĐIỀU HƯỚNG. Sự thật về việc đã trả tiền hay chưa
 * luôn lấy bằng `order.retrieve()` — một lời gọi server-to-server có ký HMAC
 * bằng secret key, không ai giả được.
 */

let cached: SePayPgClient | null = null;

function need(name: string): never {
  throw new Error(
    `Thiếu ${name}.\n` +
      "  • Máy cá nhân: thêm vào .env\n" +
      "  • Vercel/hosting: thêm vào Environment Variables rồi DEPLOY LẠI.\n" +
      "  Lấy ở SePay Merchant Portal > Cấu hình > API.",
  );
}

export function sepayEnabled(): boolean {
  return Boolean(
    process.env.SEPAY_MERCHANT_ID?.trim() && process.env.SEPAY_SECRET_KEY?.trim(),
  );
}

export function sepay(): SePayPgClient {
  const merchant_id = process.env.SEPAY_MERCHANT_ID?.trim();
  const secret_key = process.env.SEPAY_SECRET_KEY?.trim();

  if (!merchant_id) need("SEPAY_MERCHANT_ID");
  if (!secret_key) need("SEPAY_SECRET_KEY");

  cached ??= new SePayPgClient({
    // Mặc định sandbox: lỡ quên đặt biến thì chạy môi trường thử, không phải
    // môi trường thật với tiền thật.
    env: process.env.SEPAY_ENV === "production" ? "production" : "sandbox",
    merchant_id,
    secret_key,
  });
  return cached;
}

/** Địa chỉ gốc để dựng URL quay về. Sai cái này là SePay không tìm được đường về. */
export function baseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/**
 * Hỏi thẳng SePay: đơn này đã trả tiền chưa?
 *
 * Đây là nguồn sự thật duy nhất. Trả `true` chỉ khi SePay nói đã trả.
 */
export async function isOrderPaid(orderInvoiceNumber: string): Promise<{
  paid: boolean;
  raw: unknown;
}> {
  const res = await sepay().order.retrieve(orderInvoiceNumber);
  const body = res?.data ?? null;

  // Chấp nhận vài cách SePay có thể diễn đạt trạng thái. Chỉ coi là đã trả khi
  // thấy tín hiệu rõ ràng — mặc định là CHƯA trả.
  const status = String(
    body?.status ?? body?.order_status ?? body?.data?.status ?? "",
  ).toUpperCase();

  const paid = ["PAID", "SUCCESS", "SUCCEEDED", "COMPLETED", "CAPTURED"].includes(
    status,
  );

  return { paid, raw: body };
}
