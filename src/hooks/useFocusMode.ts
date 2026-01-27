'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { MappedPixel } from '@/utils/pixelation';
import { GuidanceMode, ColorProgress } from '@/components/panels/FocusControlPanel';

export interface FocusModeState {
  currentColor: string | null;
  completedCells: Set<string>;
  isPaused: boolean;
  elapsedTime: number;
  guidanceMode: GuidanceMode;
  gridInterval: number;
  showSectionLines: boolean;
  enableCelebration: boolean;
}

export interface UseFocusModeReturn {
  // 状态
  currentColor: string | null;
  completedCells: Set<string>;
  isPaused: boolean;
  elapsedTime: number;
  guidanceMode: GuidanceMode;
  gridInterval: number;
  showSectionLines: boolean;
  enableCelebration: boolean;

  // 计算属性
  colorProgress: ColorProgress[];
  totalCompleted: number;
  totalCells: number;
  isCompleted: boolean;

  // 操作
  setCurrentColor: (color: string | null) => void;
  toggleCell: (row: number, col: number) => void;
  markCellComplete: (row: number, col: number) => void;
  markCellIncomplete: (row: number, col: number) => void;
  togglePause: () => void;
  resetTimer: () => void;
  setGuidanceMode: (mode: GuidanceMode) => void;
  setGridInterval: (interval: number) => void;
  setShowSectionLines: (show: boolean) => void;
  setEnableCelebration: (enable: boolean) => void;
  reset: () => void;
}

function getCellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function useFocusMode(
  mappedPixelData: MappedPixel[][] | null,
  gridDimensions: { N: number; M: number } | null
): UseFocusModeReturn {
  // 核心状态
  const [currentColor, setCurrentColor] = useState<string | null>(null);
  const [completedCells, setCompletedCells] = useState<Set<string>>(new Set());
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [pausedTime, setPausedTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 设置状态
  const [guidanceMode, setGuidanceMode] = useState<GuidanceMode>('nearest');
  const [gridInterval, setGridInterval] = useState(10);
  const [showSectionLines, setShowSectionLines] = useState(true);
  const [enableCelebration, setEnableCelebration] = useState(true);

  // 计时器
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000) + pausedTime;
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, startTime, pausedTime]);

  // 计算颜色进度
  const { colorProgress, totalCompleted, totalCells } = useMemo(() => {
    if (!mappedPixelData || !gridDimensions) {
      return { colorProgress: [], totalCompleted: 0, totalCells: 0 };
    }

    const colorMap = new Map<string, { total: number; completed: number }>();
    let total = 0;
    let completed = 0;

    for (let row = 0; row < gridDimensions.M; row++) {
      for (let col = 0; col < gridDimensions.N; col++) {
        const pixel = mappedPixelData[row]?.[col];
        if (!pixel || pixel.isExternal) continue;

        const color = pixel.color;
        total++;

        const existing = colorMap.get(color) || { total: 0, completed: 0 };
        existing.total++;

        const cellKey = getCellKey(row, col);
        if (completedCells.has(cellKey)) {
          existing.completed++;
          completed++;
        }

        colorMap.set(color, existing);
      }
    }

    const progress: ColorProgress[] = Array.from(colorMap.entries()).map(
      ([color, data]) => ({
        color,
        completed: data.completed,
        total: data.total,
      })
    );

    return { colorProgress: progress, totalCompleted: completed, totalCells: total };
  }, [mappedPixelData, gridDimensions, completedCells]);

  const isCompleted = totalCells > 0 && totalCompleted >= totalCells;

  // 操作函数
  const toggleCell = useCallback((row: number, col: number) => {
    const cellKey = getCellKey(row, col);
    setCompletedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellKey)) {
        next.delete(cellKey);
      } else {
        next.add(cellKey);
      }
      return next;
    });
  }, []);

  const markCellComplete = useCallback((row: number, col: number) => {
    const cellKey = getCellKey(row, col);
    setCompletedCells((prev) => {
      if (prev.has(cellKey)) return prev;
      const next = new Set(prev);
      next.add(cellKey);
      return next;
    });
  }, []);

  const markCellIncomplete = useCallback((row: number, col: number) => {
    const cellKey = getCellKey(row, col);
    setCompletedCells((prev) => {
      if (!prev.has(cellKey)) return prev;
      const next = new Set(prev);
      next.delete(cellKey);
      return next;
    });
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      if (prev) {
        // 恢复计时
        setStartTime(Date.now());
        setPausedTime(elapsedTime);
      }
      return !prev;
    });
  }, [elapsedTime]);

  const resetTimer = useCallback(() => {
    setStartTime(Date.now());
    setPausedTime(0);
    setElapsedTime(0);
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
    setCurrentColor(null);
    setCompletedCells(new Set());
    resetTimer();
  }, [resetTimer]);

  return {
    // 状态
    currentColor,
    completedCells,
    isPaused,
    elapsedTime,
    guidanceMode,
    gridInterval,
    showSectionLines,
    enableCelebration,

    // 计算属性
    colorProgress,
    totalCompleted,
    totalCells,
    isCompleted,

    // 操作
    setCurrentColor,
    toggleCell,
    markCellComplete,
    markCellIncomplete,
    togglePause,
    resetTimer,
    setGuidanceMode,
    setGridInterval,
    setShowSectionLines,
    setEnableCelebration,
    reset,
  };
}

export default useFocusMode;
