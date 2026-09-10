"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

<<<<<<< HEAD
/**
 * Meta Pixel (Facebook Pixel).
 *
 * Ba điểm khác với đoạn mã Meta đưa, và cả ba đều cần thiết:
 *
 * 1. `next/script` với `afterInteractive` thay vì thẻ <script> thô. Dán thẻ thô
 *    vào App Router thì React vứt nó đi khi hydrate. Next phải là bên nạp.
 *
 * 2. App này là SPA — chuyển trang KHÔNG tải lại trình duyệt, nên đoạn mã gốc
 *    chỉ bắn PageView đúng một lần lúc mở web. Người dùng đi từ trang chủ sang
 *    /app rồi /app/wallet mà Meta chỉ thấy một lượt xem. Nên phải tự bắn thêm
 *    mỗi lần đổi đường dẫn.
 *
 * 3. ID đọc từ biến môi trường, và truyền từ layout (Server Component) xuống.
 *    KHÔNG dùng `process.env.NEXT_PUBLIC_...` trực tiếp ở đây: biến có tiền tố
 *    đó bị nướng cứng lúc build, chưa đặt lúc build là đóng băng `undefined`
 *    vĩnh viễn — đúng cái bẫy đã gây lỗi `Invalid supabaseUrl` trước đây.
 *
 * Không có ID thì không render gì. Máy cá nhân sẽ không bắn dữ liệu rác vào
 * tài khoản quảng cáo — số liệu bẩn còn tệ hơn không có số liệu.
 */

=======
>>>>>>> refs/remotes/origin/claude/mvp-scope-3-features-q0v5gz
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

<<<<<<< HEAD
export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  // Lượt đầu do chính đoạn script bên dưới bắn. Không chặn thì Meta nhận hai
  // PageView cho cùng một lần mở trang, và tỷ lệ chuyển đổi bị chia đôi.
  const daBanLanDau = useRef(false);

  useEffect(() => {
    if (!pixelId) return;
    if (!daBanLanDau.current) {
      daBanLanDau.current = true;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname, pixelId]);

  if (!pixelId) return null;
=======
/**
 * Meta Pixel.
 *
 * Đoạn script gốc của Meta chỉ bắn PageView một lần lúc tải trang. App này là
 * SPA — bấm từ /app sang /app/wallet không tải lại trang, nên nếu dán y nguyên
 * đoạn của Meta thì mọi lượt xem sau lần đầu đều không được tính. `useEffect`
 * theo `pathname` bên dưới bù đúng chỗ đó.
 */
export default function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Lần đầu đã có PageView từ chính đoạn script gốc — bắn thêm là đếm hai lần.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);
>>>>>>> refs/remotes/origin/claude/mvp-scope-3-features-q0v5gz

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
      </Script>
<<<<<<< HEAD
=======

>>>>>>> refs/remotes/origin/claude/mvp-scope-3-features-q0v5gz
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
<<<<<<< HEAD
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
=======
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
>>>>>>> refs/remotes/origin/claude/mvp-scope-3-features-q0v5gz
        />
      </noscript>
    </>
  );
}
<<<<<<< HEAD

/**
 * Bắn một sự kiện chuẩn của Meta từ bất kỳ đâu trong app.
 *
 * An toàn khi pixel chưa nạp hoặc chưa cấu hình — gọi thoải mái, không cần bọc
 * điều kiện ở nơi dùng.
 */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", name, params);
}
=======
>>>>>>> refs/remotes/origin/claude/mvp-scope-3-features-q0v5gz
