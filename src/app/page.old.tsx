'use client';

import React, { useState, useRef, ChangeEvent, DragEvent, useMemo, useCallback } from 'react';
import Script from 'next/script';
import InstallPWA from '../components/InstallPWA';
import CanvasContainer from '../components/CanvasContainer';

// 导入像素化工具和类型
import {
  PixelationMode,
  calculatePixelGrid,
  PaletteColor,
  MappedPixel,
  hexToRgb,
} from '../utils/pixelation';

import { 
  colorSystemOptions, 
  getColorKeyByHex,
  getMardToHexMapping,
  sortColorsByHue,
  ColorSystem 
} from '../utils/colorSystemUtils';

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

// 获取完整色板
const mardToHexMapping = getMardToHexMapping();
const fullBeadPalette: PaletteColor[] = Object.entries(mardToHexMapping)
  .map(([, hex]) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return { key: hex, hex, rgb };
  })
  .filter((item): item is PaletteColor => item !== null);

export default function Home() {
  // 基础状态
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<number>(50);
  const [pixelationMode, setPixelationMode] = useState<PixelationMode>(PixelationMode.Dominant);
  const [selectedColorSystem, setSelectedColorSystem] = useState<ColorSystem>('MARD');
  
  // 色板相关
  const [activeBeadPalette] = useState<PaletteColor[]>(fullBeadPalette);
  
  // 像素数据
  const [mappedPixelData, setMappedPixelData] = useState<MappedPixel[][] | null>(null);
  const [gridDimensions, setGridDimensions] = useState<{ N: number; M: number } | null>(null);
  const [colorCounts, setColorCounts] = useState<{ [key: string]: { count: number; color: string } } | null>(null);
  const [totalBeadCount, setTotalBeadCount] = useState<number>(0);
  
  // UI状态
  const [isDonationModalOpen, setIsDonationModalOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // 处理文件选择
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImageSrc(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理拖拽
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImageSrc(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 生成像素画
  const generatePixelArt = useCallback(() => {
    if (!originalImageSrc) return;

    setIsProcessing(true);
    
    const img = new Image();
    img.onload = () => {
      // 创建临时 canvas 获取图像数据
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // 计算网格尺寸
      const N = Math.round(img.height / granularity);
      const M = Math.round(img.width / granularity);

      // 获取备用颜色（第一个颜色）
      const fallbackColor = activeBeadPalette[0] || { key: '#000000', hex: '#000000', rgb: { r: 0, g: 0, b: 0 } };

      // 调用新的 API
      const mappedPixelData = calculatePixelGrid(
        ctx,
        img.width,
        img.height,
        N,
        M,
        activeBeadPalette,
        pixelationMode,
        fallbackColor
      );

      // 计算颜色统计
      const colorCounts: { [key: string]: { count: number; color: string } } = {};
      let totalBeadCount = 0;

      mappedPixelData.forEach(row => {
        row.forEach(pixel => {
          if (pixel.key && pixel.key !== 'transparent' && !pixel.isExternal) {
            if (!colorCounts[pixel.key]) {
              colorCounts[pixel.key] = { count: 0, color: pixel.color };
            }
            colorCounts[pixel.key].count++;
            totalBeadCount++;
          }
        });
      });

      setMappedPixelData(mappedPixelData);
      setGridDimensions({ N, M });
      setColorCounts(colorCounts);
      setTotalBeadCount(totalBeadCount);
      setIsProcessing(false);
    };
    img.src = originalImageSrc;
  }, [originalImageSrc, granularity, activeBeadPalette, pixelationMode]);

  // 处理像素网格更新
  const handlePixelGridUpdate = useCallback((newGrid: MappedPixel[][]) => {
    setMappedPixelData(newGrid);
    
    // 重新计算颜色统计
    const counts: { [key: string]: { count: number; color: string } } = {};
    let total = 0;
    
    newGrid.forEach(row => {
      row.forEach(pixel => {
        if (pixel.key && pixel.key !== 'transparent' && !pixel.isExternal) {
          if (!counts[pixel.key]) {
            counts[pixel.key] = { count: 0, color: pixel.color };
          }
          counts[pixel.key].count++;
          total++;
        }
      });
    });
    
    setColorCounts(counts);
    setTotalBeadCount(total);
  }, []);

  // 计算当前色板
  const currentColorPalette = useMemo(() => {
    if (!mappedPixelData) return [];
    
    const uniqueColors = new Set<string>();
    mappedPixelData.forEach(row => {
      row.forEach(pixel => {
        if (pixel.key && pixel.key !== 'transparent' && !pixel.isExternal) {
          uniqueColors.add(pixel.key);
        }
      });
    });
    
    const colorArray = Array.from(uniqueColors).map(key => {
      const colorInfo = colorCounts?.[key];
      return {
        key,
        hex: colorInfo?.color || key,
        color: colorInfo?.color || key,
        name: getColorKeyByHex(key, selectedColorSystem) || key
      };
    });
    
    return sortColorsByHue(colorArray);
  }, [mappedPixelData, colorCounts, selectedColorSystem]);

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: floatAnimation }} />
    <InstallPWA />
    
    <Script
      async
      src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
      strategy="lazyOnload"
    />
    
    <main ref={mainRef} className="relative min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* 头部 */}
      <header className="relative z-10 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                拼豆底稿生成器
              </h1>
              <span className="text-sm text-gray-400">像素画图纸生成工具</span>
            </div>
            <button
              onClick={() => setIsDonationModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black rounded-lg hover:from-yellow-500 hover:to-orange-500 transition-all duration-200 transform hover:scale-105"
            >
              打赏支持
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 container mx-auto px-4 py-8">
        {!mappedPixelData ? (
          // 上传区域
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full max-w-2xl p-12 bg-white/5 backdrop-blur-lg rounded-2xl border-2 border-dashed border-white/20 hover:border-white/40 transition-all duration-300 cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="text-center">
                <svg className="w-24 h-24 mx-auto mb-4 text-white/40 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-xl text-white/80 mb-2">点击或拖拽图片到这里</p>
                <p className="text-sm text-white/50">支持 JPG、PNG、GIF 等格式</p>
              </div>
            </div>

            {originalImageSrc && (
              <div className="mt-8 space-y-6 w-full max-w-2xl">
                {/* 参数设置 */}
                <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      精细度 ({granularity})
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={granularity}
                      onChange={(e) => {
                        setGranularity(Number(e.target.value));
                      }}
                      className="w-full"
                    />
                  </div>


                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      像素化模式
                    </label>
                    <select
                      value={pixelationMode}
                      onChange={(e) => setPixelationMode(e.target.value as unknown as PixelationMode)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      <option value={PixelationMode.Average}>平均色（真实模式）</option>
                      <option value={PixelationMode.Dominant}>主导色（卡通模式）</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      色号系统
                    </label>
                    <select
                      value={selectedColorSystem}
                      onChange={(e) => setSelectedColorSystem(e.target.value as ColorSystem)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      {colorSystemOptions.map(option => (
                        <option key={option.key} value={option.key}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={generatePixelArt}
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '生成中...' : '生成像素画'}
                </button>
              </div>
            )}
          </div>
        ) : (
          // 画布容器
          <div className="h-[calc(100vh-200px)] relative">
            <CanvasContainer
              pixelGrid={mappedPixelData}
              cellSize={10}
              onPixelGridUpdate={handlePixelGridUpdate}
              colorPalette={currentColorPalette}
              selectedColorSystem={selectedColorSystem}
            />
            
            {/* 浮动操作按钮 */}
            <div className="absolute top-4 left-4 flex gap-2">
              <button
                onClick={() => {
                  setMappedPixelData(null);
                  setColorCounts(null);
                  setTotalBeadCount(0);
                }}
                className="px-4 py-2 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white rounded-lg shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
                title="重新开始"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              <select
                value={selectedColorSystem}
                onChange={(e) => setSelectedColorSystem(e.target.value as ColorSystem)}
                className="px-3 py-2 bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-white rounded-lg shadow-lg"
              >
                {colorSystemOptions.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 统计信息 */}
            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg p-4">
              <div className="text-sm space-y-1">
                <div className="font-medium">统计信息</div>
                <div className="text-gray-600 dark:text-gray-300">
                  尺寸: {gridDimensions?.M} × {gridDimensions?.N}
                </div>
                <div className="text-gray-600 dark:text-gray-300">
                  总拼豆数: {totalBeadCount}
                </div>
                <div className="text-gray-600 dark:text-gray-300">
                  颜色数: {currentColorPalette.length}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 打赏模态框 */}
      {isDonationModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">支持作者</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              如果您觉得这个工具有帮助，欢迎打赏支持！
            </p>
            <div className="flex justify-center mb-4">
              {/* 这里可以添加二维码图片 */}
              <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">打赏二维码</span>
              </div>
            </div>
            <button
              onClick={() => setIsDonationModalOpen(false)}
              className="w-full py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </main>
    </>
  );
}