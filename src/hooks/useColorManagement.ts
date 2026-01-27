'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { PaletteColor, MappedPixel, findClosestPaletteColor } from '../utils/pixelation';
import { ColorSystem, getMardToHexMapping } from '../utils/colorSystemUtils';
import {
  loadPaletteSelections,
  savePaletteSelections,
  PaletteSelections,
} from '../utils/localStorageUtils';
import { ColorStats } from './usePixelationEngine';

// 构建完整色板
const mardToHexMapping = getMardToHexMapping();
const fullBeadPalette: PaletteColor[] = Object.entries(mardToHexMapping)
  .map(([, hex]) => {
    const rgb = hexToRgbLocal(hex);
    if (!rgb) return null;
    return { key: hex, hex, rgb };
  })
  .filter((color): color is PaletteColor => color !== null);

// 本地 hex 转 rgb 函数
function hexToRgbLocal(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export interface UseColorManagementReturn {
  // 状态
  selectedColorSystem: ColorSystem;
  activeBeadPalette: PaletteColor[];
  excludedColorKeys: Set<string>;
  customPaletteSelections: PaletteSelections;
  isCustomPalette: boolean;

  // Actions
  setSelectedColorSystem: (system: ColorSystem) => void;
  setCustomPaletteSelections: (selections: PaletteSelections) => void;
  setIsCustomPalette: (isCustom: boolean) => void;
  toggleExcludeColor: (
    hexKey: string,
    mappedPixelData: MappedPixel[][] | null,
    gridDimensions: { N: number; M: number } | null,
    initialGridColorKeys: Set<string>,
    onDataUpdate: (newData: MappedPixel[][], newCounts: ColorStats, newTotal: number) => void,
    onTriggerRemap: () => void
  ) => boolean;
  restoreAllColors: (onTriggerRemap: () => void) => void;
}

export function useColorManagement(): UseColorManagementReturn {
  // 状态
  const [selectedColorSystem, setSelectedColorSystem] = useState<ColorSystem>('MARD');
  const [excludedColorKeys, setExcludedColorKeys] = useState<Set<string>>(new Set());
  const [customPaletteSelections, setCustomPaletteSelectionsState] = useState<PaletteSelections>({});
  const [isCustomPalette, setIsCustomPalette] = useState<boolean>(false);

  // 从 localStorage 加载自定义色板
  useEffect(() => {
    const saved = loadPaletteSelections();
    if (saved && Object.keys(saved).length > 0) {
      setCustomPaletteSelectionsState(saved);
    }
  }, []);

  // 保存自定义色板到 localStorage
  const setCustomPaletteSelections = useCallback((selections: PaletteSelections) => {
    setCustomPaletteSelectionsState(selections);
    savePaletteSelections(selections);
  }, []);

  // 计算活跃色板
  const activeBeadPalette = useMemo(() => {
    if (isCustomPalette && Object.keys(customPaletteSelections).length > 0) {
      // 使用自定义色板
      const selectedHexes = new Set(
        Object.entries(customPaletteSelections)
          .filter(([, selected]) => selected)
          .map(([hex]) => hex.toUpperCase())
      );
      return fullBeadPalette.filter(color =>
        selectedHexes.has(color.hex.toUpperCase()) && !excludedColorKeys.has(color.hex.toUpperCase())
      );
    }
    // 使用完整色板
    return fullBeadPalette.filter(color => !excludedColorKeys.has(color.hex.toUpperCase()));
  }, [isCustomPalette, customPaletteSelections, excludedColorKeys]);

  // 切换颜色排除
  const toggleExcludeColor = useCallback((
    hexKey: string,
    mappedPixelData: MappedPixel[][] | null,
    gridDimensions: { N: number; M: number } | null,
    initialGridColorKeys: Set<string>,
    onDataUpdate: (newData: MappedPixel[][], newCounts: ColorStats, newTotal: number) => void,
    onTriggerRemap: () => void
  ): boolean => {
    const normalizedHexKey = hexKey.toUpperCase();
    const isExcluding = !excludedColorKeys.has(normalizedHexKey);

    if (isExcluding) {
      // 排除颜色
      if (initialGridColorKeys.size === 0) {
        console.error('Cannot exclude: initial grid colors not calculated');
        return false;
      }

      if (!mappedPixelData || !gridDimensions) {
        console.error('Cannot exclude: missing data');
        return false;
      }

      const nextExcludedKeys = new Set(excludedColorKeys);
      nextExcludedKeys.add(normalizedHexKey);

      // 计算重映射目标色板
      const potentialRemapHexKeys = new Set(initialGridColorKeys);
      potentialRemapHexKeys.delete(normalizedHexKey);
      excludedColorKeys.forEach(key => potentialRemapHexKeys.delete(key));

      const remapTargetPalette = fullBeadPalette.filter(color =>
        potentialRemapHexKeys.has(color.hex.toUpperCase())
      );

      if (remapTargetPalette.length === 0) {
        console.warn('Cannot exclude: no valid colors remain');
        return false;
      }

      // 查找被排除颜色的数据
      const excludedColorData = fullBeadPalette.find(p => p.hex.toUpperCase() === normalizedHexKey);
      if (!excludedColorData) {
        console.error('Cannot find excluded color data');
        return false;
      }

      // 重映射数据
      const { N, M } = gridDimensions;
      const newMappedData = mappedPixelData.map(row => row.map(cell => ({ ...cell })));

      for (let j = 0; j < M; j++) {
        for (let i = 0; i < N; i++) {
          const cell = newMappedData[j]?.[i];
          if (cell && !cell.isExternal && cell.color.toUpperCase() === normalizedHexKey) {
            const replacementColor = findClosestPaletteColor(excludedColorData.rgb, remapTargetPalette);
            newMappedData[j][i] = {
              ...cell,
              key: replacementColor.key,
              color: replacementColor.hex,
            };
          }
        }
      }

      // 计算新的颜色统计
      const newCounts: ColorStats = {};
      let newTotal = 0;
      newMappedData.flat().forEach(cell => {
        if (cell && cell.color && !cell.isExternal) {
          const cellHex = cell.color.toUpperCase();
          if (!newCounts[cellHex]) {
            newCounts[cellHex] = { count: 0, color: cellHex };
          }
          newCounts[cellHex].count++;
          newTotal++;
        }
      });

      // 更新状态
      setExcludedColorKeys(nextExcludedKeys);
      onDataUpdate(newMappedData, newCounts, newTotal);
      return true;
    } else {
      // 恢复颜色
      const nextExcludedKeys = new Set(excludedColorKeys);
      nextExcludedKeys.delete(normalizedHexKey);
      setExcludedColorKeys(nextExcludedKeys);
      onTriggerRemap();
      return true;
    }
  }, [excludedColorKeys]);

  // 恢复所有颜色
  const restoreAllColors = useCallback((onTriggerRemap: () => void) => {
    setExcludedColorKeys(new Set());
    onTriggerRemap();
  }, []);

  return {
    selectedColorSystem,
    activeBeadPalette,
    excludedColorKeys,
    customPaletteSelections,
    isCustomPalette,
    setSelectedColorSystem,
    setCustomPaletteSelections,
    setIsCustomPalette,
    toggleExcludeColor,
    restoreAllColors,
  };
}

export { fullBeadPalette };
export default useColorManagement;
