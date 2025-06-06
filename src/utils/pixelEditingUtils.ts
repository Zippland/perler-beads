import { MappedPixel } from './pixelation';

// 透明键定义
export const TRANSPARENT_KEY = 'ERASE';

// 透明色数据
export const transparentColorData: MappedPixel = { 
  key: TRANSPARENT_KEY, 
  color: '#FFFFFF', 
  isExternal: true 
};

/**
 * 洪水填充擦除算法
 * @param pixelData 当前像素数据
 * @param gridDimensions 网格尺寸
 * @param startRow 起始行
 * @param startCol 起始列
 * @param targetKey 目标颜色键
 * @returns 处理后的像素数据
 */
export function floodFillErase(
  pixelData: MappedPixel[][],
  gridDimensions: { N: number; M: number },
  startRow: number,
  startCol: number,
  targetKey: string
): MappedPixel[][] {
  const { N, M } = gridDimensions;
  const newPixelData = pixelData.map(row => row.map(cell => ({ ...cell })));
  const visited = Array(M).fill(null).map(() => Array(N).fill(false));
  
  // 使用栈实现非递归洪水填充
  const stack = [{ row: startRow, col: startCol }];
  
  while (stack.length > 0) {
    const { row, col } = stack.pop()!;
    
    // 检查边界
    if (row < 0 || row >= M || col < 0 || col >= N || visited[row][col]) {
      continue;
    }
    
    const currentCell = newPixelData[row][col];
    
    // 检查是否是目标颜色且不是外部区域
    if (!currentCell || currentCell.isExternal || currentCell.key !== targetKey) {
      continue;
    }
    
    // 标记为已访问
    visited[row][col] = true;
    
    // 擦除当前像素（设为透明）
    newPixelData[row][col] = { ...transparentColorData };
    
    // 添加相邻像素到栈中
    stack.push(
      { row: row - 1, col }, // 上
      { row: row + 1, col }, // 下
      { row, col: col - 1 }, // 左
      { row, col: col + 1 }  // 右
    );
  }
  
  return newPixelData;
}

/**
 * 颜色替换算法
 * @param pixelData 当前像素数据
 * @param gridDimensions 网格尺寸
 * @param sourceColor 源颜色
 * @param targetColor 目标颜色
 * @returns 处理后的像素数据和替换数量
 */
export function replaceColor(
  pixelData: MappedPixel[][],
  gridDimensions: { N: number; M: number },
  sourceColor: { key: string; color: string },
  targetColor: { key: string; color: string }
): { newPixelData: MappedPixel[][]; replaceCount: number } {
  const { N, M } = gridDimensions;
  const newPixelData = pixelData.map(row => row.map(cell => ({ ...cell })));
  let replaceCount = 0;

  // 遍历所有像素，替换匹配的颜色
  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const currentCell = newPixelData[j][i];
      if (currentCell && !currentCell.isExternal && 
          currentCell.color.toUpperCase() === sourceColor.color.toUpperCase()) {
        // 替换颜色
        newPixelData[j][i] = {
          key: targetColor.key,
          color: targetColor.color,
          isExternal: false
        };
        replaceCount++;
      }
    }
  }

  return { newPixelData, replaceCount };
}

/**
 * 单个像素上色
 * @param pixelData 当前像素数据
 * @param row 行索引
 * @param col 列索引
 * @param newColor 新颜色数据
 * @returns 处理后的像素数据和变更信息
 */
export function paintSinglePixel(
  pixelData: MappedPixel[][],
  row: number,
  col: number,
  newColor: MappedPixel
): {
  newPixelData: MappedPixel[][];
  previousCell: MappedPixel | null;
  hasChange: boolean;
} {
  const newPixelData = pixelData.map(row => row.map(cell => ({ ...cell })));
  const currentCell = newPixelData[row]?.[col];

  if (!currentCell) {
    return {
      newPixelData: pixelData,
      previousCell: null,
      hasChange: false
    };
  }

  const previousKey = currentCell.key;
  const wasExternal = currentCell.isExternal;
  
  let newCellData: MappedPixel;
  
  if (newColor.key === TRANSPARENT_KEY) {
    newCellData = { ...transparentColorData };
  } else {
    newCellData = { ...newColor, isExternal: false };
  }

  // 检查是否有变化
  const hasChange = newCellData.key !== previousKey || newCellData.isExternal !== wasExternal;
  
  if (hasChange) {
    newPixelData[row][col] = newCellData;
  }

  return {
    newPixelData: hasChange ? newPixelData : pixelData,
    previousCell: currentCell,
    hasChange
  };
}

/**
 * 重新计算颜色统计
 * @param pixelData 像素数据
 * @returns 颜色统计对象和总数
 */
export function recalculateColorStats(
  pixelData: MappedPixel[][]
): {
  colorCounts: { [hexKey: string]: { count: number; color: string } };
  totalCount: number;
} {
  const colorCounts: { [hexKey: string]: { count: number; color: string } } = {};
  let totalCount = 0;

  pixelData.flat().forEach(cell => {
    if (cell && !cell.isExternal && cell.key !== TRANSPARENT_KEY) {
      const cellHex = cell.color.toUpperCase();
      if (!colorCounts[cellHex]) {
        colorCounts[cellHex] = {
          count: 0,
          color: cellHex
        };
      }
      colorCounts[cellHex].count++;
      totalCount++;
    }
  });

  return { colorCounts, totalCount };
} 