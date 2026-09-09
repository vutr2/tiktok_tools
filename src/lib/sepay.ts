import "server-only";
import { SePayPgClient } from "sepay-pg-node";
import { cleanEnv } from "./env-value";

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
    cleanEnv(process.env.SEPAY_MERCHANT_ID) && cleanEnv(process.env.SEPAY_SECRET_KEY),
  );
}

export function sepay(): SePayPgClient {
  /**
   * `cleanEnv` chứ không phải `.trim()`.
   *
   * `.trim()` bỏ khoảng trắng nhưng GIỮ NGUYÊN dấu nháy. File .env cho phép
   * `KEY="abc"` và dotenv tự bóc nháy; ô Environment Variables trên Vercel thì
   * không — dán nguyên dòng vào đó là secret mang luôn hai dấu nháy.
   *
   * Với secret key, hậu quả câm lặng và khó lần: HMAC ký bằng `"abc"` khác hẳn
   * ký bằng `abc`, nên SePay từ chối chữ ký. Máy cá nhân chạy ngon, deploy lên
   * là lỗi — mà thông báo của cổng chẳng liên quan gì tới dấu nháy.
   */
  const merchant_id = cleanEnv(process.env.SEPAY_MERCHANT_ID);
  const secret_key = cleanEnv(process.env.SEPAY_SECRET_KEY);

  if (!merchant_id) need("SEPAY_MERCHANT_ID");
  if (!secret_key) need("SEPAY_SECRET_KEY");

  cached ??= new SePayPgClient({
    // Mặc định sandbox: lỡ quên đặt biến thì chạy môi trường thử, không phải
    // môi trường thật với tiền thật.
    // Cũng phải bóc nháy: `'"production"' === "production"` là false, nên
    // SEPAY_ENV="production" trên Vercel sẽ âm thầm rơi về sandbox — cấu hình
    // tưởng là thật mà chạy môi trường thử.
    env: cleanEnv(process.env.SEPAY_ENV) === "production" ? "production" : "sandbox",
    merchant_id,
    secret_key,
  });
  return cached;
}

/** Địa chỉ gốc để dựng URL quay về. Sai cái này là SePay không tìm được đường về. */
export function baseUrl(): string {
  const url =
    cleanEnv(process.env.NEXT_PUBLIC_BASE_URL) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/**
 * Trạng thái đơn nghĩa là ĐÃ TRẢ TIỀN.
 *
 * `CAPTURED` là giá trị SePay thật sự trả về — đo trên đơn TTNLBFK3 đã thanh
 * toán xong. Mấy giá trị còn lại giữ để phòng xa; thừa thì vô hại, thiếu thì
 * tiền vào mà tài khoản không được mở khoá.
 */
const PAID_STATUSES = ["CAPTURED", "PAID", "SUCCESS", "SUCCEEDED", "COMPLETED"];

/** Bóc lớp vỏ của SDK để lấy object đơn hàng. */
function orderBody(res: unknown): Record<string, unknown> | null {
  // Hình dạng THẬT, đo bằng đơn TTNLBFK3:
  //   res.data.data = { order_invoice_number, order_status: "CAPTURED", ... }
  // `res.data` là thân HTTP, bên trong còn một lớp `data` nữa. Code cũ dừng ở
  // `res.data` rồi tìm `.status` — không tầng nào có khoá đó, nên status luôn
  // là chuỗi rỗng và mọi đơn đều bị coi là CHƯA TRẢ.
  const http = (res as { data?: unknown } | null)?.data;
  const inner = (http as { data?: unknown } | null)?.data;
  return (inner ?? http ?? null) as Record<string, unknown> | null;
}

/**
 * Hỏi thẳng SePay: đơn này đã trả tiền chưa?
 *
 * Đây là nguồn sự thật duy nhất — lời gọi server-to-server ký bằng secret key.
 * Không tin gói tin IPN, không tin tham số trên URL quay về.
 */
export async function isOrderPaid(orderInvoiceNumber: string): Promise<{
  paid: boolean;
  status: string;
  raw: unknown;
}> {
  const res = await sepay().order.retrieve(orderInvoiceNumber);
  const body = orderBody(res);

  const status = String(
    body?.order_status ?? body?.status ?? "",
  ).toUpperCase();

  return { paid: PAID_STATUSES.includes(status), status, raw: body };
}
