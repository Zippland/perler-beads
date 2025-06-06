import { MappedPixel } from './pixelation';

// 洪水填充获取连通区域
export function getConnectedRegion(
  mappedPixelData: MappedPixel[][],
  startRow: number,
  startCol: number,
  targetColor: string
): { row: number; col: number }[] {
  if (!mappedPixelData || !mappedPixelData[startRow] || !mappedPixelData[startRow][startCol]) {
    return [];
  }

  const M = mappedPixelData.length;
  const N = mappedPixelData[0].length;
  const visited = Array(M).fill(null).map(() => Array(N).fill(false));
  const region: { row: number; col: number }[] = [];
  
  // 使用栈实现非递归洪水填充
  const stack = [{ row: startRow, col: startCol }];
  
  while (stack.length > 0) {
    const { row, col } = stack.pop()!;
    
    // 检查边界
    if (row < 0 || row >= M || col < 0 || col >= N || visited[row][col]) {
      continue;
    }
    
    const currentCell = mappedPixelData[row][col];
    
    // 检查是否是目标颜色且不是外部区域
    if (!currentCell || currentCell.isExternal || currentCell.color !== targetColor) {
      continue;
    }
    
    // 标记为已访问
    visited[row][col] = true;
    
    // 添加到区域
    region.push({ row, col });
    
    // 添加相邻像素到栈中
    stack.push(
      { row: row - 1, col }, // 上
      { row: row + 1, col }, // 下
      { row, col: col - 1 }, // 左
      { row, col: col + 1 }  // 右
    );
  }
  
  return region;
}

// 获取所有同颜色的连通区域
export function getAllConnectedRegions(
  mappedPixelData: MappedPixel[][],
  targetColor: string
): { row: number; col: number }[][] {
  if (!mappedPixelData || mappedPixelData.length === 0) {
    return [];
  }

  const M = mappedPixelData.length;
  const N = mappedPixelData[0].length;
  const visited = Array(M).fill(null).map(() => Array(N).fill(false));
  const regions: { row: number; col: number }[][] = [];

  for (let row = 0; row < M; row++) {
    for (let col = 0; col < N; col++) {
      if (!visited[row][col]) {
        const currentCell = mappedPixelData[row][col];
        
        if (currentCell && !currentCell.isExternal && currentCell.color === targetColor) {
          const region = getConnectedRegion(mappedPixelData, row, col, targetColor);
          
          if (region.length > 0) {
            regions.push(region);
            
            // 标记该区域的所有像素为已访问
            region.forEach(({ row: r, col: c }) => {
              visited[r][c] = true;
            });
          }
        }
      }
    }
  }

  return regions;
}

// 检查区域是否完全已完成
export function isRegionCompleted(
  region: { row: number; col: number }[],
  completedCells: Set<string>
): boolean {
  return region.every(({ row, col }) => completedCells.has(`${row},${col}`));
}

// 检查区域是否部分已完成
export function isRegionPartiallyCompleted(
  region: { row: number; col: number }[],
  completedCells: Set<string>
): boolean {
  return region.some(({ row, col }) => completedCells.has(`${row},${col}`));
}

// 获取区域的中心点（用于定位和显示）
export function getRegionCenter(region: { row: number; col: number }[]): { row: number; col: number } {
  if (region.length === 0) {
    return { row: 0, col: 0 };
  }

  const totalRow = region.reduce((sum, cell) => sum + cell.row, 0);
  const totalCol = region.reduce((sum, cell) => sum + cell.col, 0);

  return {
    row: Math.floor(totalRow / region.length),
    col: Math.floor(totalCol / region.length)
  };
}

// 根据距离排序区域（用于最近优先的引导模式）
export function sortRegionsByDistance(
  regions: { row: number; col: number }[][],
  referencePoint: { row: number; col: number }
): { row: number; col: number }[][] {
  return regions.sort((a, b) => {
    const centerA = getRegionCenter(a);
    const centerB = getRegionCenter(b);
    
    const distanceA = Math.abs(centerA.row - referencePoint.row) + Math.abs(centerA.col - referencePoint.col);
    const distanceB = Math.abs(centerB.row - referencePoint.row) + Math.abs(centerB.col - referencePoint.col);
    
    return distanceA - distanceB;
  });
}

// 根据大小排序区域（用于最大优先的引导模式）
export function sortRegionsBySize(
  regions: { row: number; col: number }[][]
): { row: number; col: number }[][] {
  return regions.sort((a, b) => b.length - a.length);
} 