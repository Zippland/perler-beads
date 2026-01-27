'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { MappedPixel } from '@/utils/pixelation';
import { cn } from '@/lib/utils';
import { WorkspaceMode } from '@/types/workspace';

export interface UnifiedCanvasProps {
  // 核心数据
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  mode: WorkspaceMode;

  // 交互回调
  onCellClick?: (row: number, col: number) => void;
  onCellHover?: (row: number, col: number, x: number, y: number) => void;
  onHoverEnd?: () => void;

  // 预览/编辑模式
  highlightColorKey?: string | null;
  isManualColoringMode?: boolean;

  // 专注模式
  currentColor?: string;
  completedCells?: Set<string>;
  recommendedRegion?: { row: number; col: number }[] | null;

  // 通用选项
  showGrid?: boolean;
  showSectionLines?: boolean;
  gridSectionInterval?: number;
  sectionLineColor?: string;

  // 缩放/平移
  scale?: number;
  offset?: { x: number; y: number };
  onScaleChange?: (scale: number) => void;
  onOffsetChange?: (offset: { x: number; y: number }) => void;

  className?: string;
}

// 最小单元格尺寸
const MIN_CELL_SIZE = 4;
const MAX_CELL_SIZE = 20;
const DEFAULT_CELL_SIZE = 10;

// 转灰度
function toGrayscale(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  return `rgb(${gray}, ${gray}, ${gray})`;
}

export function UnifiedCanvas({
  mappedPixelData,
  gridDimensions,
  mode,
  onCellClick,
  onCellHover,
  onHoverEnd,
  highlightColorKey,
  isManualColoringMode = false,
  currentColor,
  completedCells,
  recommendedRegion,
  showGrid = true,
  showSectionLines = false,
  gridSectionInterval = 10,
  sectionLineColor = '#ff0000',
  scale = 1,
  offset = { x: 0, y: 0 },
  onScaleChange,
  onOffsetChange,
  className,
}: UnifiedCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // 检测暗色模式
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // 监听容器尺寸变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    resizeObserver.observe(container);

    // 初始化尺寸
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setContainerSize({ width: rect.width, height: rect.height });
    }

    return () => resizeObserver.disconnect();
  }, []);

  // 高亮效果定时器
  useEffect(() => {
    if (highlightColorKey && mode !== 'focus') {
      setIsHighlighting(true);
      const timer = setTimeout(() => setIsHighlighting(false), 300);
      return () => clearTimeout(timer);
    }
  }, [highlightColorKey, mode]);

  // 计算单元格大小
  const getCellSize = useCallback(() => {
    if (!gridDimensions) return DEFAULT_CELL_SIZE;

    const { N, M } = gridDimensions;

    if (mode === 'focus') {
      return Math.max(15, Math.min(40, 300 / Math.max(N, M)));
    }

    // 预览/编辑模式：基于容器大小
    if (!containerSize || containerSize.width <= 0 || containerSize.height <= 0) {
      // 容器尺寸尚未确定，使用合理的默认值
      return DEFAULT_CELL_SIZE;
    }

    const maxWidth = containerSize.width - 40; // 留出边距
    const maxHeight = containerSize.height - 40;
    const cellWidth = maxWidth / N;
    const cellHeight = maxHeight / M;
    
    // 限制在合理范围内
    return Math.max(MIN_CELL_SIZE, Math.min(cellWidth, cellHeight, MAX_CELL_SIZE));
  }, [gridDimensions, mode, containerSize]);

  // 渲染画布
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !mappedPixelData || !gridDimensions) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { N, M } = gridDimensions;
    const cellSize = getCellSize();
    const canvasWidth = N * cellSize;
    const canvasHeight = M * cellSize;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 颜色配置
    const externalBgColor = isDarkMode ? '#374151' : '#F3F4F6';
    const gridLineColor = isDarkMode ? '#4B5563' : '#DDDDDD';

    // 渲染每个单元格
    for (let row = 0; row < M; row++) {
      for (let col = 0; col < N; col++) {
        const pixel = mappedPixelData[row]?.[col];
        if (!pixel) continue;

        const x = col * cellSize;
        const y = row * cellSize;
        const cellKey = `${row},${col}`;

        // 确定填充颜色
        let fillColor = pixel.color;

        if (pixel.isExternal) {
          fillColor = externalBgColor;
        } else if (mode === 'focus' && currentColor && pixel.color !== currentColor) {
          // 专注模式：非当前颜色显示灰度
          fillColor = toGrayscale(pixel.color);
        }

        // 绘制单元格背景
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, cellSize, cellSize);

        // 专注模式：已完成的单元格
        if (mode === 'focus' && completedCells?.has(cellKey) && pixel.color === currentColor) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
          ctx.fillRect(x, y, cellSize, cellSize);

          // 勾选图标
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + cellSize * 0.2, y + cellSize * 0.5);
          ctx.lineTo(x + cellSize * 0.4, y + cellSize * 0.7);
          ctx.lineTo(x + cellSize * 0.8, y + cellSize * 0.3);
          ctx.stroke();
        }

        // 专注模式：推荐区域高亮
        if (mode === 'focus' && recommendedRegion) {
          const isInRegion = recommendedRegion.some(cell => cell.row === row && cell.col === col);
          if (isInRegion) {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            ctx.setLineDash([]);
          }
        }

        // 预览/编辑模式：高亮遮罩
        if (isHighlighting && highlightColorKey && mode !== 'focus') {
          const shouldDim = pixel.isExternal || pixel.color.toUpperCase() !== highlightColorKey.toUpperCase();
          if (shouldDim) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }

        // 绘制网格线
        if (showGrid) {
          ctx.strokeStyle = gridLineColor;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 0.5, y + 0.5, cellSize, cellSize);
        }
      }
    }

    // 绘制分区线
    if (showSectionLines) {
      ctx.strokeStyle = sectionLineColor;
      ctx.lineWidth = 2;

      for (let col = gridSectionInterval; col < N; col += gridSectionInterval) {
        ctx.beginPath();
        ctx.moveTo(col * cellSize, 0);
        ctx.lineTo(col * cellSize, canvasHeight);
        ctx.stroke();
      }

      for (let row = gridSectionInterval; row < M; row += gridSectionInterval) {
        ctx.beginPath();
        ctx.moveTo(0, row * cellSize);
        ctx.lineTo(canvasWidth, row * cellSize);
        ctx.stroke();
      }
    }
  }, [
    mappedPixelData,
    gridDimensions,
    mode,
    getCellSize,
    isDarkMode,
    currentColor,
    completedCells,
    recommendedRegion,
    isHighlighting,
    highlightColorKey,
    showGrid,
    showSectionLines,
    gridSectionInterval,
    sectionLineColor,
  ]);

  // 监听数据变化重新渲染
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // 获取点击的网格位置
  const getGridPosition = useCallback(
    (clientX: number, clientY: number): { row: number; col: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas || !gridDimensions) return null;

      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) / scale;
      const y = (clientY - rect.top) / scale;
      const cellSize = getCellSize();

      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);

      if (row >= 0 && row < gridDimensions.M && col >= 0 && col < gridDimensions.N) {
        return { row, col };
      }
      return null;
    },
    [gridDimensions, scale, getCellSize]
  );

  // 鼠标/触摸事件处理
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // 中键或按住空格键时启动拖拽
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        isDraggingRef.current = true;
        setIsPanning(true);
        dragStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          offsetX: offset.x,
          offsetY: offset.y,
        };
      }
    },
    [offset]
  );

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsPanning(false);
      dragStartRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // 如果刚刚拖拽过，不触发点击
      if (isDraggingRef.current) return;
      
      const pos = getGridPosition(e.clientX, e.clientY);
      if (pos && onCellClick) {
        onCellClick(pos.row, pos.col);
      }
    },
    [getGridPosition, onCellClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // 处理拖拽
      if (isDraggingRef.current && dragStartRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        onOffsetChange?.({
          x: dragStartRef.current.offsetX + dx / scale,
          y: dragStartRef.current.offsetY + dy / scale,
        });
        return;
      }

      const pos = getGridPosition(e.clientX, e.clientY);
      if (pos && onCellHover) {
        onCellHover(pos.row, pos.col, e.pageX, e.pageY);
      }
    },
    [getGridPosition, onCellHover, scale, onOffsetChange]
  );

  const handleMouseLeave = useCallback(() => {
    onHoverEnd?.();
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsPanning(false);
      dragStartRef.current = null;
    }
  }, [onHoverEnd]);

  // 双指缩放
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setLastPinchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1) {
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastPinchDistance !== null) {
        const newDistance = getTouchDistance(e.touches);
        const scaleChange = newDistance / lastPinchDistance;
        const newScale = Math.max(0.5, Math.min(3, scale * scaleChange));
        onScaleChange?.(newScale);
        setLastPinchDistance(newDistance);
      } else if (e.touches.length === 1 && lastPanPoint) {
        const dx = e.touches[0].clientX - lastPanPoint.x;
        const dy = e.touches[0].clientY - lastPanPoint.y;
        onOffsetChange?.({ x: offset.x + dx, y: offset.y + dy });
        setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    },
    [lastPinchDistance, lastPanPoint, scale, offset, onScaleChange, onOffsetChange]
  );

  const handleTouchEnd = useCallback(() => {
    setLastPinchDistance(null);
    setLastPanPoint(null);
  }, []);

  // 鼠标滚轮缩放 - 所有模式都支持
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      // 如果没有缩放回调，不处理
      if (!onScaleChange) return;

      e.preventDefault();
      const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.3, Math.min(5, scale * scaleChange));
      onScaleChange(newScale);
    },
    [scale, onScaleChange]
  );

  if (!mappedPixelData || !gridDimensions) {
    return null;
  }

  const cellSize = getCellSize();
  const canvasWidth = gridDimensions.N * cellSize;
  const canvasHeight = gridDimensions.M * cellSize;

  // 计算光标样式
  const getCursorStyle = () => {
    if (isPanning) return 'grabbing';
    if (isManualColoringMode) return 'crosshair';
    return 'grab';
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden w-full h-full min-h-[300px] min-w-[300px] flex items-center justify-center',
        className
      )}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        style={{
          transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
          transformOrigin: 'center center',
          width: canvasWidth,
          height: canvasHeight,
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          className="border border-border rounded block"
          style={{ 
            imageRendering: 'pixelated',
            cursor: getCursorStyle(),
          }}
        />
      </div>
    </div>
  );
}

export default UnifiedCanvas;
