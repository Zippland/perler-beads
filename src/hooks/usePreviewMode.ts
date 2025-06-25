import { useState, useCallback } from 'react';
import { MappedPixel } from '../utils/pixelation';

export type PreviewTool = 'view' | 'paint' | 'erase' | 'replace';

export function usePreviewMode(
  pixelGrid: MappedPixel[][],
  onPixelGridUpdate: (newGrid: MappedPixel[][]) => void
) {
  const [selectedTool, setSelectedTool] = useState<PreviewTool>('view');
  const [selectedColorKey, setSelectedColorKey] = useState<string>('');
  const [highlightColorKey, setHighlightColorKey] = useState<string | null>(null);
  const [replaceModeState, setReplaceModeState] = useState<{
    isActive: boolean;
    sourceColor?: string;
  }>({ isActive: false });

  // 获取连通区域（用于洪水填充）
  const getConnectedRegion = useCallback((
    startX: number,
    startY: number,
    targetKey: string
  ): Array<{ x: number; y: number }> => {
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

  // 处理单元格点击
  const handleCellClick = useCallback((pixel: MappedPixel, x: number, y: number) => {
    if (!pixel || pixel.isExternal) return;

    switch (selectedTool) {
      case 'view':
        // 仅查看，不做操作
        break;

      case 'paint':
        if (selectedColorKey && pixel.key !== selectedColorKey) {
          const newGrid = pixelGrid.map(row => [...row]);
          newGrid[y][x] = {
            ...pixel,
            key: selectedColorKey,
            color: selectedColorKey
          };
          onPixelGridUpdate(newGrid);
        }
        break;

      case 'erase':
        // 洪水填充擦除
        const region = getConnectedRegion(x, y, pixel.key);
        if (region.length > 0) {
          const newGrid = pixelGrid.map(row => [...row]);
          region.forEach(cell => {
            newGrid[cell.y][cell.x] = {
              ...newGrid[cell.y][cell.x],
              key: 'transparent',
              color: '#ffffff'
            };
          });
          onPixelGridUpdate(newGrid);
        }
        break;

      case 'replace':
        if (replaceModeState.isActive && replaceModeState.sourceColor) {
          // 执行颜色替换
          if (selectedColorKey && pixel.key !== selectedColorKey) {
            const newGrid = pixelGrid.map(row => [...row]);
            for (let y = 0; y < newGrid.length; y++) {
              for (let x = 0; x < newGrid[0].length; x++) {
                if (newGrid[y][x].key === replaceModeState.sourceColor) {
                  newGrid[y][x] = {
                    ...newGrid[y][x],
                    key: selectedColorKey,
                    color: selectedColorKey
                  };
                }
              }
            }
            onPixelGridUpdate(newGrid);
            setReplaceModeState({ isActive: false });
          }
        } else {
          // 选择源颜色
          setReplaceModeState({
            isActive: true,
            sourceColor: pixel.key
          });
        }
        break;
    }
  }, [selectedTool, selectedColorKey, replaceModeState, pixelGrid, getConnectedRegion, onPixelGridUpdate]);

  // 切换高亮颜色
  const toggleHighlight = useCallback((colorKey: string) => {
    setHighlightColorKey(prev => prev === colorKey ? null : colorKey);
  }, []);

  // 重置工具状态
  const resetToolState = useCallback(() => {
    setReplaceModeState({ isActive: false });
  }, []);

  return {
    // 状态
    selectedTool,
    selectedColorKey,
    highlightColorKey,
    replaceModeState,

    // 方法
    setSelectedTool,
    setSelectedColorKey,
    handleCellClick,
    toggleHighlight,
    resetToolState,
  };
}