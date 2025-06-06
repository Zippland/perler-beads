import { useCallback } from 'react';
import { MappedPixel } from '../utils/pixelation';
import { 
  floodFillErase, 
  replaceColor, 
  paintSinglePixel, 
  recalculateColorStats,
  TRANSPARENT_KEY 
} from '../utils/pixelEditingUtils';

interface UsePixelEditingOperationsProps {
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  colorCounts: { [key: string]: { count: number; color: string } } | null;
  totalBeadCount: number;
  onPixelDataChange: (newData: MappedPixel[][]) => void;
  onColorCountsChange: (counts: { [key: string]: { count: number; color: string } }) => void;
  onTotalCountChange: (count: number) => void;
}

/**
 * 像素编辑操作hook
 */
export function usePixelEditingOperations({
  mappedPixelData,
  gridDimensions,
  colorCounts,
  totalBeadCount,
  onPixelDataChange,
  onColorCountsChange,
  onTotalCountChange
}: UsePixelEditingOperationsProps) {

  // 执行洪水填充擦除
  const performFloodFillErase = useCallback((
    startRow: number, 
    startCol: number, 
    targetKey: string
  ) => {
    if (!mappedPixelData || !gridDimensions) return;

    const newPixelData = floodFillErase(mappedPixelData, gridDimensions, startRow, startCol, targetKey);
    onPixelDataChange(newPixelData);

    // 重新计算颜色统计
    const { colorCounts: newColorCounts, totalCount: newTotalCount } = recalculateColorStats(newPixelData);
    onColorCountsChange(newColorCounts);
    onTotalCountChange(newTotalCount);
  }, [mappedPixelData, gridDimensions, onPixelDataChange, onColorCountsChange, onTotalCountChange]);

  // 执行颜色替换
  const performColorReplace = useCallback((
    sourceColor: { key: string; color: string },
    targetColor: { key: string; color: string }
  ) => {
    if (!mappedPixelData || !gridDimensions) return 0;

    const { newPixelData, replaceCount } = replaceColor(
      mappedPixelData, 
      gridDimensions, 
      sourceColor, 
      targetColor
    );

    if (replaceCount > 0) {
      onPixelDataChange(newPixelData);

      // 重新计算颜色统计
      const { colorCounts: newColorCounts, totalCount: newTotalCount } = recalculateColorStats(newPixelData);
      onColorCountsChange(newColorCounts);
      onTotalCountChange(newTotalCount);

      console.log(`颜色替换完成：将 ${replaceCount} 个 ${sourceColor.key} 替换为 ${targetColor.key}`);
    }

    return replaceCount;
  }, [mappedPixelData, gridDimensions, onPixelDataChange, onColorCountsChange, onTotalCountChange]);

  // 执行单像素上色
  const performSinglePixelPaint = useCallback((
    row: number,
    col: number,
    newColor: MappedPixel
  ) => {
    if (!mappedPixelData || !colorCounts) return;

    const { newPixelData, previousCell, hasChange } = paintSinglePixel(
      mappedPixelData,
      row,
      col,
      newColor
    );

    if (!hasChange || !previousCell) return;

    onPixelDataChange(newPixelData);

    // 更新颜色统计
    const newColorCounts = { ...colorCounts };
    let newTotalCount = totalBeadCount;

    // 处理之前颜色的减少（使用hex值）
    if (!previousCell.isExternal && previousCell.key !== TRANSPARENT_KEY) {
      const previousHex = previousCell.color?.toUpperCase();
      if (previousHex && newColorCounts[previousHex]) {
        newColorCounts[previousHex].count--;
        if (newColorCounts[previousHex].count <= 0) {
          delete newColorCounts[previousHex];
        }
        newTotalCount--;
      }
    }

    // 处理新颜色的增加（使用hex值）
    if (!newColor.isExternal && newColor.key !== TRANSPARENT_KEY) {
      const newHex = newColor.color.toUpperCase();
      if (!newColorCounts[newHex]) {
        newColorCounts[newHex] = {
          count: 0,
          color: newHex
        };
      }
      newColorCounts[newHex].count++;
      newTotalCount++;
    }

    onColorCountsChange(newColorCounts);
    onTotalCountChange(newTotalCount);
  }, [mappedPixelData, colorCounts, totalBeadCount, onPixelDataChange, onColorCountsChange, onTotalCountChange]);

  return {
    performFloodFillErase,
    performColorReplace,
    performSinglePixelPaint
  };
} 