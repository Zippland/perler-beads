'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PixelationMode,
  calculatePixelGrid,
  RgbColor,
  PaletteColor,
  MappedPixel,
  colorDistance,
} from '../utils/pixelation';
import { TRANSPARENT_KEY } from '../utils/pixelEditingUtils';

// 颜色统计类型
export interface ColorStats {
  [key: string]: { count: number; color: string };
}

// Hook 返回类型
export interface UsePixelationEngineReturn {
  // 状态
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  colorCounts: ColorStats | null;
  totalBeadCount: number;
  initialGridColorKeys: Set<string>;
  isProcessing: boolean;

  // Actions
  processImage: (
    imageSrc: string,
    granularity: number,
    similarityThreshold: number,
    palette: PaletteColor[],
    mode: PixelationMode
  ) => void;
  setMappedPixelData: (data: MappedPixel[][] | null) => void;
  updateColorStats: (data: MappedPixel[][]) => void;
  clearData: () => void;
}

export function usePixelationEngine(): UsePixelationEngineReturn {
  // 状态
  const [mappedPixelData, setMappedPixelData] = useState<MappedPixel[][] | null>(null);
  const [gridDimensions, setGridDimensions] = useState<{ N: number; M: number } | null>(null);
  const [colorCounts, setColorCounts] = useState<ColorStats | null>(null);
  const [totalBeadCount, setTotalBeadCount] = useState<number>(0);
  const [initialGridColorKeys, setInitialGridColorKeys] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Canvas refs
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelatedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 初始化隐藏的 canvas 元素
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!originalCanvasRef.current) {
        originalCanvasRef.current = document.createElement('canvas');
      }
      if (!pixelatedCanvasRef.current) {
        pixelatedCanvasRef.current = document.createElement('canvas');
      }
    }
  }, []);

  // 更新颜色统计
  const updateColorStats = useCallback((data: MappedPixel[][]) => {
    const counts: ColorStats = {};
    let total = 0;

    data.flat().forEach(cell => {
      if (cell && cell.color && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
        const hexKey = cell.color.toUpperCase();
        if (!counts[hexKey]) {
          counts[hexKey] = { count: 0, color: hexKey };
        }
        counts[hexKey].count++;
        total++;
      }
    });

    setColorCounts(counts);
    setTotalBeadCount(total);
  }, []);

  // 处理图像
  const processImage = useCallback((
    imageSrc: string,
    granularity: number,
    similarityThreshold: number,
    palette: PaletteColor[],
    mode: PixelationMode
  ) => {
    if (!originalCanvasRef.current || !pixelatedCanvasRef.current) {
      console.error('Canvas refs not available');
      return;
    }

    if (palette.length === 0) {
      console.error('Cannot pixelate: palette is empty');
      setMappedPixelData(null);
      setGridDimensions(null);
      return;
    }

    setIsProcessing(true);

    const originalCanvas = originalCanvasRef.current;
    const pixelatedCanvas = pixelatedCanvasRef.current;
    const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
    const pixelatedCtx = pixelatedCanvas.getContext('2d');

    if (!originalCtx || !pixelatedCtx) {
      console.error('Canvas contexts not available');
      setIsProcessing(false);
      return;
    }

    // 查找默认背景色
    const fallbackColor = palette.find(p => p.hex.toUpperCase() === '#FFFFFF') || palette[0];

    const img = new window.Image();

    img.onerror = () => {
      console.error('Image loading failed');
      setMappedPixelData(null);
      setGridDimensions(null);
      setColorCounts(null);
      setInitialGridColorKeys(new Set());
      setIsProcessing(false);
    };

    img.onload = () => {
      const aspectRatio = img.height / img.width;
      const N = granularity;
      const M = Math.max(1, Math.round(N * aspectRatio));

      if (N <= 0 || M <= 0) {
        console.error('Invalid grid dimensions');
        setIsProcessing(false);
        return;
      }

      // 动态调整画布尺寸
      const baseWidth = 500;
      const minCellSize = 4;
      const recommendedCellSize = 6;

      let outputWidth = baseWidth;
      if (N > 100) {
        const requiredWidthForRecommendedSize = N * recommendedCellSize;
        const maxWidth = Math.min(1200, typeof window !== 'undefined' ? window.innerWidth * 0.9 : 1200);
        outputWidth = Math.min(maxWidth, Math.max(baseWidth, requiredWidthForRecommendedSize));
        outputWidth = Math.max(outputWidth, N * minCellSize);
      }

      const outputHeight = Math.round(outputWidth * aspectRatio);

      originalCanvas.width = img.width;
      originalCanvas.height = img.height;
      pixelatedCanvas.width = outputWidth;
      pixelatedCanvas.height = outputHeight;

      originalCtx.drawImage(img, 0, 0, img.width, img.height);

      // 1. 初始颜色映射
      const initialMappedData = calculatePixelGrid(
        originalCtx,
        img.width,
        img.height,
        N,
        M,
        palette,
        mode,
        fallbackColor
      );

      // 2. 构建颜色查找映射
      const keyToRgbMap = new Map<string, RgbColor>();
      const keyToColorDataMap = new Map<string, PaletteColor>();
      palette.forEach(p => {
        keyToRgbMap.set(p.key, p.rgb);
        keyToColorDataMap.set(p.key, p);
      });

      // 3. 统计初始颜色数量
      const initialColorCounts: { [key: string]: number } = {};
      initialMappedData.flat().forEach(cell => {
        if (cell && cell.key && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
          initialColorCounts[cell.key] = (initialColorCounts[cell.key] || 0) + 1;
        }
      });

      // 4. 按频率排序颜色
      const colorsByFrequency = Object.entries(initialColorCounts)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);

      // 5. 复制数据准备合并
      const mergedData: MappedPixel[][] = initialMappedData.map(row =>
        row.map(cell => ({ ...cell, isExternal: cell.isExternal ?? false }))
      );

      // 6. 相似颜色合并
      const replacedColors = new Set<string>();

      for (let i = 0; i < colorsByFrequency.length; i++) {
        const currentKey = colorsByFrequency[i];
        if (replacedColors.has(currentKey)) continue;

        const currentRgb = keyToRgbMap.get(currentKey);
        if (!currentRgb) continue;

        for (let j = i + 1; j < colorsByFrequency.length; j++) {
          const lowerFreqKey = colorsByFrequency[j];
          if (replacedColors.has(lowerFreqKey)) continue;

          const lowerFreqRgb = keyToRgbMap.get(lowerFreqKey);
          if (!lowerFreqRgb) continue;

          const dist = colorDistance(currentRgb, lowerFreqRgb);

          if (dist < similarityThreshold) {
            replacedColors.add(lowerFreqKey);

            // 替换所有使用低频颜色的单元格
            for (let r = 0; r < M; r++) {
              for (let c = 0; c < N; c++) {
                if (mergedData[r][c].key === lowerFreqKey) {
                  const colorData = keyToColorDataMap.get(currentKey);
                  if (colorData) {
                    mergedData[r][c] = {
                      key: currentKey,
                      color: colorData.hex,
                      isExternal: false,
                    };
                  }
                }
              }
            }
          }
        }
      }

      // 7. 更新状态
      setMappedPixelData(mergedData);
      setGridDimensions({ N, M });

      // 8. 计算最终颜色统计
      const counts: ColorStats = {};
      let total = 0;
      mergedData.flat().forEach(cell => {
        if (cell && cell.color && !cell.isExternal) {
          const hexKey = cell.color.toUpperCase();
          if (!counts[hexKey]) {
            counts[hexKey] = { count: 0, color: hexKey };
          }
          counts[hexKey].count++;
          total++;
        }
      });

      setColorCounts(counts);
      setTotalBeadCount(total);
      setInitialGridColorKeys(new Set(Object.keys(counts)));
      setIsProcessing(false);
    };

    img.src = imageSrc;
  }, []);

  // 清除数据
  const clearData = useCallback(() => {
    setMappedPixelData(null);
    setGridDimensions(null);
    setColorCounts(null);
    setTotalBeadCount(0);
    setInitialGridColorKeys(new Set());
  }, []);

  return {
    mappedPixelData,
    gridDimensions,
    colorCounts,
    totalBeadCount,
    initialGridColorKeys,
    isProcessing,
    processImage,
    setMappedPixelData,
    updateColorStats,
    clearData,
  };
}

export default usePixelationEngine;
