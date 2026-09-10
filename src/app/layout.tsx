import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import MetaPixel from "@/components/meta-pixel";
import { cleanEnv } from "@/lib/env-value";

/**
 * Be Vietnam Pro — font do người Việt dựng, có đủ bộ dấu.
 * Font hệ thống trên Android hay vỡ dấu ở "ị", "ữ", "ặ"; đây là thứ người bán
 * nhìn cả ngày nên không để tuỳ máy.
 */
const beVietnam = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Studio bán hàng — ảnh, mô tả, kịch bản",
  description:
    "Ba việc: ảnh sản phẩm studio, mô tả chuẩn Shopee/TikTok, kịch bản video 30 giây.",
};

/**
 * ID pixel Meta, đọc lúc CHẠY.
 *
 * Ưu tiên `META_PIXEL_ID` (không tiền tố) rồi mới tới `NEXT_PUBLIC_META_PIXEL_ID`.
 * Biến có tiền tố NEXT_PUBLIC_ bị nướng cứng vào bundle lúc build: chưa đặt lúc
 * build là đóng băng `undefined` vĩnh viễn, đặt lại trên Vercel cũng vô ích cho
 * tới khi deploy lại — đúng cái bẫy đã gây lỗi `Invalid supabaseUrl` trước đây.
 * Giữ tên có tiền tố làm phương án dự phòng phòng khi trên hosting đã đặt tên đó.
 *
 * ID pixel vốn công khai (ai xem mã nguồn trang cũng thấy), nên đưa xuống client
 * không có gì phải giấu.
 *
 * Chỉ bật ở production: chạy `next dev` mà vẫn đẩy dữ liệu vào pixel thật là tự
 * làm bẩn số liệu quảng cáo bằng chính traffic của mình.
 */
function metaPixelId(): string {
  if (process.env.NODE_ENV !== "production") return "";
  return (
    cleanEnv(process.env.META_PIXEL_ID) ??
    cleanEnv(process.env.NEXT_PUBLIC_META_PIXEL_ID) ??
    ""
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <MetaPixel pixelId={metaPixelId()} />
        {children}
      </body>
    </html>
  );
}
