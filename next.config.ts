import type { NextConfig } from "next";

// 检测是否是 Electron 打包模式
const isElectronBuild = process.env.ELECTRON_BUILD === 'true';

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" || isElectronBuild,
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  // Electron 打包时使用静态导出
  ...(isElectronBuild && {
    output: 'export',
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  }),
};

// Electron 打包时不使用 PWA
export default isElectronBuild ? nextConfig : withPWA(nextConfig);
