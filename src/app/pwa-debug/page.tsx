'use client';

import { useEffect, useState } from 'react';

export default function PWADebug() {
  const [debugInfo, setDebugInfo] = useState<{
    manifest: object | null | { error: string };
    serviceWorker: object | null;
    https: boolean;
    standalone: boolean;
    installable: boolean;
    installPromptSupported?: boolean;
  }>({
    manifest: null,
    serviceWorker: null,
    https: false,
    standalone: false,
    installable: false,
  });

  useEffect(() => {
    const checkPWA = async () => {
      const info: {
        manifest?: object | null | { error: string };
        serviceWorker?: object | null;
        https?: boolean;
        standalone?: boolean;
        installable?: boolean;
        installPromptSupported?: boolean;
      } = {};

      // 检查 HTTPS
      info.https = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

      // 检查 Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          info.serviceWorker = {
            supported: true,
            registrations: registrations.length,
            active: registrations.some(reg => reg.active),
          };
        } catch (e) {
          info.serviceWorker = { error: e instanceof Error ? e.message : 'Unknown error' };
        }
      } else {
        info.serviceWorker = { supported: false };
      }

      // 检查 manifest
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        try {
          const response = await fetch(manifestLink.getAttribute('href') || '');
          const manifest = await response.json();
          info.manifest = manifest;
        } catch (e) {
          info.manifest = { error: e instanceof Error ? e.message : 'Unknown error' };
        }
      } else {
        info.manifest = { error: 'No manifest link found' };
      }

      // 检查是否独立模式
      info.standalone = window.matchMedia('(display-mode: standalone)').matches;

      // 检查 beforeinstallprompt
      info.installPromptSupported = 'onbeforeinstallprompt' in window;

      setDebugInfo({
        manifest: info.manifest || null,
        serviceWorker: info.serviceWorker || null,
        https: info.https || false,
        standalone: info.standalone || false,
        installable: info.installable || false,
        installPromptSupported: info.installPromptSupported,
      });
    };

    checkPWA();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PWA 调试信息</h1>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">基本检查</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${debugInfo.https ? 'bg-green-500' : 'bg-red-500'}`}></span>
                HTTPS: {debugInfo.https ? '是' : '否'} ({typeof window !== 'undefined' ? window.location.protocol : 'N/A'})
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${debugInfo.serviceWorker ? 'bg-green-500' : 'bg-red-500'}`}></span>
                Service Worker: {JSON.stringify(debugInfo.serviceWorker, null, 2)}
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${debugInfo.standalone ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                独立模式: {debugInfo.standalone ? '是' : '否'}
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${debugInfo.installPromptSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
                安装提示支持: {debugInfo.installPromptSupported ? '支持' : '不支持'}
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Manifest 信息</h2>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
              {JSON.stringify(debugInfo.manifest, null, 2)}
            </pre>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">手动安装方法</h2>
            <div className="space-y-2 text-gray-600 dark:text-gray-300">
              <p><strong>iOS Safari:</strong></p>
              <ol className="list-decimal list-inside ml-4">
                <li>点击分享按钮（方框带向上箭头）</li>
                <li>选择&ldquo;添加到主屏幕&rdquo;</li>
                <li>点击&ldquo;添加&rdquo;</li>
              </ol>
              
              <p className="mt-4"><strong>Android Chrome/Edge:</strong></p>
              <ol className="list-decimal list-inside ml-4">
                <li>点击菜单（三个点）</li>
                <li>选择&ldquo;添加到主屏幕&rdquo;或&ldquo;安装应用&rdquo;</li>
                <li>点击&ldquo;添加&rdquo;或&ldquo;安装&rdquo;</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}