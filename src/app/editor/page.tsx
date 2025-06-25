'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CanvasContainer from '../../components/CanvasContainer';

// 导入像素化工具和类型
import {
  PixelationMode,
  calculatePixelGrid,
  PaletteColor,
  MappedPixel,
  hexToRgb,
} from '../../utils/pixelation';

import { 
  getColorKeyByHex,
  getMardToHexMapping,
  sortColorsByHue,
  ColorSystem 
} from '../../utils/colorSystemUtils';

// 获取完整色板
const mardToHexMapping = getMardToHexMapping();
const fullBeadPalette: PaletteColor[] = Object.entries(mardToHexMapping)
  .map(([, hex]) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return { key: hex, hex, rgb };
  })
  .filter((item): item is PaletteColor => item !== null);

export default function EditorPage() {
  const router = useRouter();
  
  // 基础状态
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<number>(50);
  const [pixelationMode, setPixelationMode] = useState<PixelationMode>(PixelationMode.Dominant);
  const [selectedColorSystem] = useState<ColorSystem>('MARD');
  const [activeBeadPalette] = useState<PaletteColor[]>(fullBeadPalette);
  
  // 像素数据
  const [mappedPixelData, setMappedPixelData] = useState<MappedPixel[][] | null>(null);
  const [colorCounts, setColorCounts] = useState<{ [key: string]: { count: number; color: string } } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // 从 localStorage 加载图片
  useEffect(() => {
    const imageSrc = localStorage.getItem('uploadedImage');
    if (imageSrc) {
      setOriginalImageSrc(imageSrc);
      localStorage.removeItem('uploadedImage'); // 清除以避免重复加载
    } else {
      // 如果没有图片，返回首页
      router.push('/');
    }
  }, [router]);

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

      mappedPixelData.forEach(row => {
        row.forEach(pixel => {
          if (pixel.key && pixel.key !== 'transparent' && !pixel.isExternal) {
            if (!colorCounts[pixel.key]) {
              colorCounts[pixel.key] = { count: 0, color: pixel.color };
            }
            colorCounts[pixel.key].count++;
          }
        });
      });

      setMappedPixelData(mappedPixelData);
      setColorCounts(colorCounts);
      setIsProcessing(false);
    };
    img.src = originalImageSrc;
  }, [originalImageSrc, granularity, activeBeadPalette, pixelationMode]);

  // 首次加载时自动生成
  useEffect(() => {
    if (originalImageSrc && !mappedPixelData) {
      generatePixelArt();
    }
  }, [originalImageSrc, mappedPixelData, generatePixelArt]);

  // 处理像素网格更新
  const handlePixelGridUpdate = useCallback((newGrid: MappedPixel[][]) => {
    setMappedPixelData(newGrid);
    
    // 重新计算颜色统计
    const counts: { [key: string]: { count: number; color: string } } = {};
    
    newGrid.forEach(row => {
      row.forEach(pixel => {
        if (pixel.key && pixel.key !== 'transparent' && !pixel.isExternal) {
          if (!counts[pixel.key]) {
            counts[pixel.key] = { count: 0, color: pixel.color };
          }
          counts[pixel.key].count++;
        }
      });
    });
    
    setColorCounts(counts);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
      {/* 顶部工具栏 */}
      <header className="bg-black/30 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="返回首页"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            
            <h1 className="text-xl font-bold text-white">拼豆底稿编辑器</h1>
          </div>

          {/* 参数调整 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-white/80">精细度:</label>
              <input
                type="range"
                min="10"
                max="200"
                value={granularity}
                onChange={(e) => setGranularity(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-white/60 w-12">{granularity}</span>
            </div>

            <select
              value={pixelationMode}
              onChange={(e) => setPixelationMode(e.target.value as unknown as PixelationMode)}
              className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
            >
              <option value={PixelationMode.Average}>平均色</option>
              <option value={PixelationMode.Dominant}>主导色</option>
            </select>

            <button
              onClick={generatePixelArt}
              disabled={isProcessing}
              className="px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '生成中...' : '重新生成'}
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 container mx-auto p-4">
        {mappedPixelData ? (
          <div className="h-full">
            <CanvasContainer
              pixelGrid={mappedPixelData}
              cellSize={10}
              onPixelGridUpdate={handlePixelGridUpdate}
              colorPalette={currentColorPalette}
              selectedColorSystem={selectedColorSystem}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-xl">加载中...</div>
          </div>
        )}
      </div>
    </div>
  );
}