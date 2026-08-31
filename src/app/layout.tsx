import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bộ công cụ bán hàng — ảnh, mô tả, kịch bản",
  description:
    "Ba việc: ảnh sản phẩm studio, mô tả chuẩn Shopee/TikTok, kịch bản video 30 giây.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
