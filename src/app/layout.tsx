import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import MetaPixel from "@/components/meta-pixel";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Chỉ bắn ở production. Chạy `next dev` mà vẫn đẩy dữ liệu vào pixel thật là
  // tự làm bẩn số liệu quảng cáo bằng chính traffic của mình.
  const pixelId =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_META_PIXEL_ID
      : undefined;

  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="min-h-screen bg-canvas text-ink antialiased">
        {children}
        {pixelId ? <MetaPixel pixelId={pixelId} /> : null}
      </body>
    </html>
  );
}
