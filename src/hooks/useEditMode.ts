import { useState, useCallback, useRef, useEffect } from 'react';
import { MappedPixel } from '../utils/pixelation';

export type RecommendMode = 'nearest' | 'largest' | 'edge-first';

interface Region {
  cells: Array<{ x: number; y: number }>;
  bounds: { x: number; y: number; width: number; height: number };
}

export function useEditMode(pixelGrid: MappedPixel[][]) {
  const [currentColorKey, setCurrentColorKey] = useState<string>('');
  const [markedCells, setMarkedCells] = useState<Set<string>>(new Set());
  const [recommendedRegion, setRecommendedRegion] = useState<Region['bounds'] | null>(null);
  const [recommendMode, setRecommendMode] = useState<RecommendMode>('nearest');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastMarkedPosition, setLastMarkedPosition] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 启动/停止计时器
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  // 获取连通区域
  const getConnectedRegion = useCallback((startX: number, startY: number, targetKey: string): Array<{ x: number; y: number }> => {
    const visited = new Set<string>();
    const region: Array<{ x: number; y: number }> = [];
    const stack = [{ x: startX, y: startY }];

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (
        x < 0 || x >= pixelGrid[0].length ||
        y < 0 || y >= pixelGrid.length ||
        pixelGrid[y][x].key !== targetKey ||
        pixelGrid[y][x].isExternal
      ) {
        continue;
      }

      region.push({ x, y });

      // 添加相邻格子
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }

    return region;
  }, [pixelGrid]);

  // 查找所有未标记的区域
  const findUnmarkedRegions = useCallback((): Region[] => {
    const visited = new Set<string>();
    const regions: Region[] = [];

    for (let y = 0; y < pixelGrid.length; y++) {
      for (let x = 0; x < pixelGrid[0].length; x++) {
        const key = `${x},${y}`;
        const pixel = pixelGrid[y][x];

        if (
          !visited.has(key) &&
          pixel.key === currentColorKey &&
          !pixel.isExternal &&
          !markedCells.has(key)
        ) {
          const cells = getConnectedRegion(x, y, currentColorKey);
          cells.forEach(cell => visited.add(`${cell.x},${cell.y}`));

          if (cells.length > 0) {
            const bounds = {
              x: Math.min(...cells.map(c => c.x)),
              y: Math.min(...cells.map(c => c.y)),
              width: 0,
              height: 0
            };
            bounds.width = Math.max(...cells.map(c => c.x)) - bounds.x + 1;
            bounds.height = Math.max(...cells.map(c => c.y)) - bounds.y + 1;

            regions.push({ cells, bounds });
          }
        }
      }
    }

    return regions;
  }, [pixelGrid, currentColorKey, markedCells, getConnectedRegion]);

  // 推荐下一个区域
  const recommendNextRegion = useCallback(() => {
    const regions = findUnmarkedRegions();
    if (regions.length === 0) {
      setRecommendedRegion(null);
      return;
    }

    let selectedRegion: Region | null = null;

    switch (recommendMode) {
      case 'largest':
        selectedRegion = regions.reduce((largest, region) =>
          region.cells.length > largest.cells.length ? region : largest
        );
        break;

      case 'nearest':
        if (lastMarkedPosition) {
          selectedRegion = regions.reduce((nearest, region) => {
            const nearestDist = Math.min(...nearest.cells.map(cell =>
              Math.hypot(cell.x - lastMarkedPosition.x, cell.y - lastMarkedPosition.y)
            ));
            const regionDist = Math.min(...region.cells.map(cell =>
              Math.hypot(cell.x - lastMarkedPosition.x, cell.y - lastMarkedPosition.y)
            ));
            return regionDist < nearestDist ? region : nearest;
          });
        } else {
          selectedRegion = regions[0];
        }
        break;

      case 'edge-first':
        selectedRegion = regions.reduce((edgiest, region) => {
          const edgeCount = region.cells.filter(cell => {
            const x = cell.x;
            const y = cell.y;
            return x === 0 || y === 0 || 
                   x === pixelGrid[0].length - 1 || 
                   y === pixelGrid.length - 1;
          }).length;
          const edgiestCount = edgiest.cells.filter(cell => {
            const x = cell.x;
            const y = cell.y;
            return x === 0 || y === 0 || 
                   x === pixelGrid[0].length - 1 || 
                   y === pixelGrid.length - 1;
          }).length;
          return edgeCount > edgiestCount ? region : edgiest;
        });
        break;
    }

    if (selectedRegion) {
      setRecommendedRegion(selectedRegion.bounds);
    }
  }, [findUnmarkedRegions, recommendMode, lastMarkedPosition, pixelGrid]);

  // 标记单元格
  const markCell = useCallback((x: number, y: number) => {
    const pixel = pixelGrid[y]?.[x];
    if (!pixel || pixel.key !== currentColorKey || pixel.isExternal) return;

    const region = getConnectedRegion(x, y, currentColorKey);
    const newMarkedCells = new Set(markedCells);
    let hasChanges = false;

    region.forEach(cell => {
      const key = `${cell.x},${cell.y}`;
      if (!newMarkedCells.has(key)) {
        newMarkedCells.add(key);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setMarkedCells(newMarkedCells);
      setLastMarkedPosition({ x, y });
      
      // 开始计时
      if (!isTimerRunning) {
        setIsTimerRunning(true);
      }
    }
  }, [pixelGrid, currentColorKey, markedCells, getConnectedRegion, isTimerRunning]);

  // 计算进度
  const calculateProgress = useCallback(() => {
    if (!currentColorKey) return { completed: 0, total: 0, percentage: 0 };

    let total = 0;
    let completed = 0;

    for (let y = 0; y < pixelGrid.length; y++) {
      for (let x = 0; x < pixelGrid[0].length; x++) {
        const pixel = pixelGrid[y][x];
        if (pixel.key === currentColorKey && !pixel.isExternal) {
          total++;
          if (markedCells.has(`${x},${y}`)) {
            completed++;
          }
        }
      }
    }

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [pixelGrid, currentColorKey, markedCells]);

  // 切换颜色
  const switchColor = useCallback((colorKey: string) => {
    setCurrentColorKey(colorKey);
    setMarkedCells(new Set());
    setRecommendedRegion(null);
    setLastMarkedPosition(null);
  }, []);

  // 重置编辑状态
  const resetEditMode = useCallback(() => {
    setCurrentColorKey('');
    setMarkedCells(new Set());
    setRecommendedRegion(null);
    setLastMarkedPosition(null);
    setElapsedTime(0);
    setIsTimerRunning(false);
  }, []);

  // 自动推荐下一个区域
  useEffect(() => {
    if (currentColorKey) {
      recommendNextRegion();
    }
  }, [currentColorKey, markedCells, recommendNextRegion]);

  return {
    // 状态
    currentColorKey,
    markedCells,
    recommendedRegion,
    recommendMode,
    isTimerRunning,
    elapsedTime,
    
    // 方法
    markCell,
    switchColor,
    setRecommendMode,
    calculateProgress,
    resetEditMode,
    toggleTimer: () => setIsTimerRunning(prev => !prev),
  };
}