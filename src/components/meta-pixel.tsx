"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

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

      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
