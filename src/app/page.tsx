'use client';

import React, { useState, useRef, ChangeEvent, DragEvent, useEffect } from 'react';
import Script from 'next/script';
import InstallPWA from '../components/InstallPWA';
import DonationModal from '../components/DonationModal';

// 添加自定义动画样式
const floatAnimation = `
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0px); }
  }
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
`;

export default function Home() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [showDonationModal, setShowDonationModal] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 处理文件上传，跳转到编辑页面
      // 这里可以使用 localStorage 或其他方式传递文件数据
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        localStorage.setItem('uploadedImage', imageSrc);
        window.location.href = '/studio';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        localStorage.setItem('uploadedImage', imageSrc);
        window.location.href = '/studio';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: floatAnimation }} />
    <InstallPWA />
    
    <Script
      async
      src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
      strategy="lazyOnload"
    />

    <div className="min-h-screen p-4 sm:p-6 flex flex-col items-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 font-[family-name:var(--font-geist-sans)] overflow-x-hidden">
      {/* 头部 - 超华丽Logo设计 */}
      <header className="w-full md:max-w-4xl text-center mt-6 mb-8 sm:mt-8 sm:mb-10 relative overflow-hidden">
        {/* 装饰背景 */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-blue-100 dark:bg-blue-900 rounded-full opacity-30 dark:opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-pink-100 dark:bg-pink-900 rounded-full opacity-30 dark:opacity-20 blur-3xl"></div>

        {/* 装饰点阵 */}
        <div className="absolute top-0 right-0 grid grid-cols-5 gap-1 opacity-20 dark:opacity-10">
          {[...Array(25)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600"></div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 grid grid-cols-5 gap-1 opacity-20 dark:opacity-10">
          {[...Array(25)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600"></div>
          ))}
        </div>

        {/* 超华丽Logo和标题 */}
        <div className="relative z-10 py-8">
          <div className="relative flex flex-col items-center">
            {/* 16颗拼豆动态Logo */}
            <div className="relative mb-6 animate-float">
              <div className="relative grid grid-cols-4 gap-2 p-4 bg-white/95 dark:bg-gray-800/95 rounded-3xl shadow-2xl border-4 border-gradient-to-r from-pink-300 via-purple-300 to-blue-300 dark:border-gray-600">
                {['bg-red-400', 'bg-blue-400', 'bg-yellow-400', 'bg-green-400',
                  'bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-teal-400',
                  'bg-indigo-400', 'bg-cyan-400', 'bg-lime-400', 'bg-amber-400',
                  'bg-rose-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400'].map((color, i) => (
                  <div key={i} className="relative">
                    <div
                      className={`w-5 h-5 rounded-full ${color} transition-all duration-500 hover:scale-150 shadow-xl hover:shadow-2xl relative z-10`}
                      style={{
                        animation: `float ${2 + (i % 3)}s ease-in-out infinite ${i * 0.1}s`,
                        boxShadow: `0 0 20px ${color.includes('red') ? '#f87171' : color.includes('blue') ? '#60a5fa' : color.includes('yellow') ? '#fbbf24' : color.includes('green') ? '#4ade80' : color.includes('purple') ? '#a855f7' : color.includes('pink') ? '#f472b6' : color.includes('orange') ? '#fb923c' : color.includes('teal') ? '#2dd4bf' : color.includes('indigo') ? '#818cf8' : color.includes('cyan') ? '#22d3ee' : color.includes('lime') ? '#84cc16' : color.includes('amber') ? '#f59e0b' : color.includes('rose') ? '#fb7185' : color.includes('sky') ? '#0ea5e9' : color.includes('emerald') ? '#10b981' : '#8b5cf6'}70`
                      }}
                    ></div>
                    {/* 每颗豆子的微装饰 */}
                    {i % 4 === 0 && <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-yellow-300 rounded-full animate-ping"></div>}
                    {i % 4 === 1 && <div className="absolute -bottom-0.5 -left-0.5 w-0.5 h-0.5 bg-pink-300 rounded-full animate-pulse"></div>}
                    {i % 4 === 2 && <div className="absolute -top-0.5 -left-0.5 w-0.5 h-0.5 bg-blue-300 rounded-full animate-bounce"></div>}
                    {i % 4 === 3 && <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 bg-purple-300 rounded-full animate-spin"></div>}
                  </div>
                ))}
              </div>
              
              {/* Logo周围的装饰 */}
              <div className="absolute -top-3 -right-4 w-3 h-3 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full animate-ping transform rotate-12"></div>
              <div className="absolute -top-1 -right-2 w-2 h-2 bg-gradient-to-br from-pink-400 to-purple-500 rotate-45 animate-spin"></div>
              <div className="absolute -bottom-3 -left-4 w-2.5 h-2.5 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-1 -left-2 w-1.5 h-1.5 bg-gradient-to-br from-green-400 to-teal-500 rotate-45 animate-pulse"></div>
              <div className="absolute top-0 -right-1 w-1 h-1 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full animate-pulse delay-100"></div>
              <div className="absolute -top-2 left-2 w-1 h-1 bg-gradient-to-br from-orange-400 to-red-500 rounded-full animate-bounce delay-200"></div>
              <div className="absolute bottom-1 -right-3 w-1.5 h-1.5 bg-gradient-to-br from-indigo-400 to-purple-500 rotate-45 animate-spin delay-300"></div>
              <div className="absolute -bottom-2 right-1 w-0.5 h-0.5 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full animate-ping delay-400"></div>
              
              {/* 额外的微闪光 */}
              <div className="absolute -top-4 left-1 w-0.5 h-0.5 bg-yellow-300 rounded-full animate-pulse delay-500"></div>
              <div className="absolute top-2 -left-4 w-0.5 h-0.5 bg-pink-300 rounded-full animate-bounce delay-600"></div>
              <div className="absolute -bottom-4 right-2 w-0.5 h-0.5 bg-blue-300 rounded-full animate-ping delay-700"></div>
              <div className="absolute bottom-2 -right-5 w-0.5 h-0.5 bg-purple-300 rounded-full animate-pulse delay-800"></div>
            </div>

            {/* 品牌名和工具名 */}
            <div className="relative flex flex-col items-center space-y-3">
              {/* 品牌名 - 七卡瓦 */}
              <div className="relative">
                <h1 className="relative text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 via-blue-500 to-cyan-400 tracking-wider drop-shadow-2xl transform hover:scale-105 transition-transform duration-300 animate-bounce">
                  七卡瓦
                </h1>
                
                {/* 品牌名周围的装饰 */}
                <div className="absolute -top-4 -right-5 w-4 h-4 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full animate-spin transform rotate-12"></div>
                <div className="absolute -top-2 -right-2 w-2.5 h-2.5 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-0.5 w-1.5 h-1.5 bg-gradient-to-br from-purple-400 to-blue-500 rotate-45 animate-pulse delay-100"></div>
                <div className="absolute -bottom-3 -left-5 w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-500 rotate-45 animate-bounce delay-200"></div>
                <div className="absolute -bottom-1 -left-2 w-2 h-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full animate-spin delay-300"></div>
                <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full animate-pulse delay-400"></div>
                <div className="absolute -bottom-4 -right-3 w-3 h-3 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full animate-bounce delay-500"></div>
                <div className="absolute top-1 -left-4 w-2 h-2 bg-gradient-to-br from-pink-400 to-red-500 rotate-45 animate-ping delay-600"></div>
                
                {/* 额外的微闪光 */}
                <div className="absolute -top-3 left-0 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-700"></div>
                <div className="absolute -top-2 right-3 w-0.5 h-0.5 bg-pink-300 rounded-full animate-bounce delay-800"></div>
                <div className="absolute bottom-0 -left-1 w-0.5 h-0.5 bg-blue-300 rounded-full animate-ping delay-900"></div>
                <div className="absolute bottom-1 right-0 w-1 h-1 bg-purple-300 rounded-full animate-pulse delay-1000"></div>
              </div>
              
              {/* 工具名 - 拼豆底稿生成器 */}
              <div className="relative">
                <h2 className="relative text-xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-teal-500 via-green-500 to-emerald-400 tracking-widest transform hover:scale-102 transition-all duration-300">
                  拼豆底稿生成器
                </h2>
                
                {/* 工具名周围的装饰 */}
                <div className="absolute -top-3 -left-6 w-3.5 h-3.5 bg-gradient-to-br from-blue-400 to-teal-500 rounded-full animate-bounce delay-75"></div>
                <div className="absolute -top-1 -left-3 w-2 h-2 bg-gradient-to-br from-teal-400 to-green-500 rounded-full animate-ping delay-150"></div>
                <div className="absolute -top-0.5 -left-1 w-1 h-1 bg-gradient-to-br from-green-400 to-emerald-500 rotate-45 animate-pulse delay-225"></div>
                <div className="absolute -top-3 -right-6 w-3 h-3 bg-gradient-to-br from-green-400 to-emerald-500 rotate-45 animate-spin delay-300"></div>
                <div className="absolute -top-1 -right-3 w-1.5 h-1.5 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full animate-bounce delay-375"></div>
                <div className="absolute -bottom-2 -right-3 w-2.5 h-2.5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full animate-pulse delay-450"></div>
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gradient-to-br from-teal-400 to-blue-500 rotate-45 animate-spin delay-525"></div>
                
                {/* 微闪光 */}
                <div className="absolute -top-2 left-2 w-0.5 h-0.5 bg-blue-300 rounded-full animate-ping delay-600"></div>
                <div className="absolute -top-1 right-2 w-1 h-1 bg-teal-300 rounded-full animate-pulse delay-675"></div>
                <div className="absolute bottom-0 left-4 w-0.5 h-0.5 bg-green-300 rounded-full animate-bounce delay-750"></div>
                <div className="absolute bottom-1 right-4 w-0.5 h-0.5 bg-emerald-300 rounded-full animate-pulse delay-825"></div>
                <div className="absolute top-2 -left-2 w-0.5 h-0.5 bg-cyan-300 rounded-full animate-ping delay-900"></div>
                <div className="absolute top-2 -right-2 w-1 h-1 bg-teal-300 rounded-full animate-bounce delay-975"></div>
              </div>
            </div>
            
            {/* 周围的浮动星座 */}
            <div className="absolute -top-10 -left-10 w-3 h-3 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full animate-float"></div>
            <div className="absolute -top-8 -left-6 w-1.5 h-1.5 bg-gradient-to-br from-purple-400 to-pink-500 rotate-45 animate-spin delay-100"></div>
            <div className="absolute -top-6 -left-12 w-2 h-2 bg-gradient-to-br from-pink-400 to-red-500 rounded-full animate-bounce delay-200"></div>
            
            <div className="absolute -top-10 -right-10 w-2.5 h-2.5 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full animate-ping delay-300"></div>
            <div className="absolute -top-6 -right-14 w-1 h-1 bg-gradient-to-br from-cyan-400 to-blue-500 rotate-45 animate-pulse delay-400"></div>
            <div className="absolute -top-4 -right-8 w-3 h-3 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full animate-bounce delay-500"></div>
            
            <div className="absolute -bottom-10 -left-10 w-2 h-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-pulse delay-600"></div>
            <div className="absolute -bottom-8 -left-14 w-1.5 h-1.5 bg-gradient-to-br from-orange-400 to-red-500 rotate-45 animate-spin delay-700"></div>
            <div className="absolute -bottom-6 -left-6 w-2.5 h-2.5 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full animate-float delay-800"></div>
            
            <div className="absolute -bottom-10 -right-10 w-3 h-3 bg-gradient-to-br from-green-400 to-teal-500 rotate-45 animate-bounce delay-900"></div>
            <div className="absolute -bottom-8 -right-6 w-1 h-1 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full animate-ping delay-1000"></div>
            <div className="absolute -bottom-6 -right-14 w-2 h-2 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full animate-pulse delay-1100"></div>
            
            {/* 额外的魔法闪光 */}
            <div className="absolute -top-12 left-0 w-0.5 h-0.5 bg-yellow-300 rounded-full animate-ping delay-1200"></div>
            <div className="absolute -top-2 -left-16 w-1 h-1 bg-pink-300 rounded-full animate-bounce delay-1300"></div>
            <div className="absolute top-2 -right-18 w-0.5 h-0.5 bg-blue-300 rounded-full animate-pulse delay-1400"></div>
            <div className="absolute -bottom-12 right-0 w-1 h-1 bg-purple-300 rounded-full animate-float delay-1500"></div>
            <div className="absolute -bottom-2 -right-16 w-0.5 h-0.5 bg-green-300 rounded-full animate-ping delay-1600"></div>
            <div className="absolute bottom-2 -left-18 w-1 h-1 bg-teal-300 rounded-full animate-bounce delay-1700"></div>
          </div>

          {/* 分隔线 */}
          <div className="h-1 w-24 mx-auto my-3 bg-gradient-to-r from-blue-500 to-pink-500 rounded-full"></div>

          {/* 标语 */}
          <p className="mt-4 text-base sm:text-lg font-light text-gray-600 dark:text-gray-300 max-w-lg mx-auto text-center tracking-[0.1em] leading-relaxed">
            让像素创意属于每一个人
          </p>
          
          {/* 小红书链接 */}
          <div className="mt-8 flex flex-col items-center justify-center space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              发布平台请标注来源或保留图片水印及标识
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
              <span>欢迎到</span>
              <a href="https://www.xiaohongshu.com/user/profile/623e8b080000000010007721" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors duration-200 hover:underline font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 1024 1024" fill="currentColor" className="mr-0.5">
                  <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64z m238.8 360.2l-57.7 93.3c-10.1 16.3-31.5 21.3-47.8 11.2l-112.4-69.5c-16.3-10.1-21.3-31.5-11.2-47.8l57.7-93.3c10.1-16.3 31.5-21.3 47.8-11.2l112.4 69.5c16.3 10.1 21.3 31.5 11.2 47.8zM448 496l-57.7 93.3c-10.1 16.3-31.5 21.3-47.8 11.2l-112.4-69.5c-16.3-10.1-21.3-31.5-11.2-47.8l57.7-93.3c10.1-16.3 31.5-21.3 47.8-11.2l112.4 69.5c16.3 10.1 21.3 31.5 11.2 47.8z m248.9 43.2l-57.7 93.3c-10.1 16.3-31.5 21.3-47.8 11.2l-112.4-69.5c-16.3-10.1-21.3-31.5-11.2-47.8l57.7-93.3c10.1-16.3 31.5-21.3 47.8-11.2l112.4 69.5c16.3 10.1 21.3 31.5 11.2 47.8z"/>
                </svg>
                小红书
              </a>
              <span>提建议和围观微信小程序开发进度</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 - 文件上传 */}
      <main className="w-full md:max-w-4xl flex flex-col items-center space-y-5 sm:space-y-6 relative overflow-hidden">
        {/* 上传区域 */}
        <div
          onDrop={handleDrop} 
          onDragOver={handleDragOver} 
          onDragEnter={handleDragOver}
          onClick={isMounted ? triggerFileInput : undefined}
          className={`border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 sm:p-8 text-center ${
            isMounted ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-800' : 'cursor-wait'
          } transition-all duration-300 w-full md:max-w-md flex flex-col justify-center items-center shadow-sm hover:shadow-md`}
          style={{ minHeight: '130px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500 mb-2 sm:mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            拖放图片到此处，或<span className="font-medium text-blue-600 dark:text-blue-400">点击选择文件</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">支持 JPG, PNG 图片格式</p>
        </div>

        {/* 提示框 */}
        <div className="w-full md:max-w-md bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg border border-blue-100 dark:border-gray-600 shadow-sm">
          <p className="text-xs text-indigo-700 dark:text-indigo-300 flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0 text-blue-500 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>小贴士：使用像素图进行转换前，请确保图片的边缘吻合像素格子的边界线，这样可以获得更精确的切割效果和更好的成品。</span>
          </p>
        </div>

        <input 
          type="file" 
          accept="image/jpeg, image/png" 
          onChange={handleFileChange} 
          ref={fileInputRef} 
          className="hidden" 
        />
      </main>

      {/* 打赏链接 */}
      <div className="mt-8 mb-4 text-center">
        <button
          onClick={() => setShowDonationModal(true)}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 text-white rounded-full hover:from-pink-500 hover:via-rose-500 hover:to-orange-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a2 2 0 0 1 2 2v1c0 1.1-.9 2-2 2h-1" fill="currentColor" opacity="0.3" />
            <path d="M6 8h12v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8z" fill="currentColor" opacity="0.3" />
            <path d="M6 8V7a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1" />
            <path d="M12 16v-4" />
            <path d="M9.5 14.5L9 16" />
            <path d="M14.5 14.5L15 16" />
          </svg>
          Buy Me A Milk Tea
        </button>
      </div>

      {/* 页脚统计信息 */}
      <footer className="mt-auto py-8 text-center text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center justify-center gap-4">
          <span>访问量: <span id="busuanzi_value_site_pv">...</span></span>
          <span>访客数: <span id="busuanzi_value_site_uv">...</span></span>
        </div>
      </footer>
    </div>
    
    {/* 打赏模态框 */}
    <DonationModal 
      isOpen={showDonationModal} 
      onClose={() => setShowDonationModal(false)} 
    />
    </>
  );
}