'use client';

import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { isElectron } from "@/utils/electronUtils";

/**
 * Web-only 组件：仅在 Web 环境下渲染 Analytics 和 AdSense
 * 在 Electron 环境下不渲染这些组件
 */
export function WebOnlyComponents() {
  // 在 Electron 环境下不渲染任何内容
  if (typeof window !== 'undefined' && isElectron()) {
    return null;
  }

  return (
    <>
      <Analytics />
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7207313144293144"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
    </>
  );
}
