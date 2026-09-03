import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

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
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="min-h-screen bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
