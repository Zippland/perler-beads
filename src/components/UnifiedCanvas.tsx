'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MappedPixel } from '../utils/pixelation';

export type CanvasMode = 'preview' | 'edit';

export interface UnifiedCanvasProps {
  // 基础数据
  pixelGrid: MappedPixel[][];
  cellSize: number;
  
  // 模式控制
  mode: CanvasMode;
  
  // 预览模式属性
  onCellClick?: (cell: MappedPixel, x: number, y: number) => void;
  onCellHover?: (cell: MappedPixel | null, x: number, y: number) => void;
  highlightColorKey?: string | null;
  showGrid?: boolean;
  
  // 编辑模式属性
  currentColorKey?: string;
  markedCells?: Set<string>;
  onMarkCell?: (x: number, y: number) => void;
  recommendedRegion?: { x: number; y: number; width: number; height: number } | null;
  
  // 通用属性
  className?: string;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function UnifiedCanvas({
  pixelGrid,
  cellSize,
  mode,
  onCellClick,
  onCellHover,
  highlightColorKey,
  showGrid = true,
  currentColorKey,
  markedCells = new Set(),
  onMarkCell,
  recommendedRegion,
  className = '',
  onCanvasReady,
}: UnifiedCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const canvasWidth = pixelGrid[0]?.length || 0;
  const canvasHeight = pixelGrid.length || 0;

  // 计算画布实际尺寸
  const actualWidth = canvasWidth * cellSize;
  const actualHeight = canvasHeight * cellSize;

  // 渲染画布
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 保存当前状态
    ctx.save();

    // 应用缩放和平移
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // 绘制像素格子
    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const pixel = pixelGrid[y][x];
        if (!pixel || pixel.isExternal || pixel.key === 'transparent') continue;

        const cellX = x * cellSize;
        const cellY = y * cellSize;

        // 根据模式决定颜色
        let fillColor = pixel.color;
        let alpha = 1;

        if (mode === 'preview') {
          // 预览模式：高亮功能
          if (highlightColorKey && pixel.key !== highlightColorKey) {
            alpha = 0.3;
          }
        } else if (mode === 'edit' && currentColorKey) {
          // 编辑模式：专心模式效果
          if (pixel.key !== currentColorKey) {
            // 非当前颜色显示为灰度
            // 从 hex 颜色提取 RGB 值
            const colorHex = pixel.color.replace('#', '');
            const r = parseInt(colorHex.substr(0, 2), 16);
            const g = parseInt(colorHex.substr(2, 2), 16);
            const b = parseInt(colorHex.substr(4, 2), 16);
            const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            fillColor = `rgb(${gray}, ${gray}, ${gray})`;
            alpha = 0.5;
          }
        }

        // 设置透明度
        ctx.globalAlpha = alpha;

        // 填充格子
        ctx.fillStyle = fillColor;
        ctx.fillRect(cellX, cellY, cellSize, cellSize);

        // 编辑模式下的标记
        if (mode === 'edit' && markedCells.has(`${x},${y}`)) {
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = '#10b981';
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
        }

        // 恢复透明度
        ctx.globalAlpha = 1;
      }
    }

    // 绘制网格线
    if (showGrid && scale > 0.5) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1 / scale;

      for (let x = 0; x <= canvasWidth; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, actualHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= canvasHeight; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(actualWidth, y * cellSize);
        ctx.stroke();
      }
    }

    // 绘制悬停效果
    if (hoveredCell && scale > 0.5) {
      const { x, y } = hoveredCell;
      ctx.strokeStyle = mode === 'edit' ? '#3b82f6' : '#6366f1';
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }

    // 绘制推荐区域（编辑模式）
    if (mode === 'edit' && recommendedRegion) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([5 / scale, 5 / scale]);
      ctx.strokeRect(
        recommendedRegion.x * cellSize,
        recommendedRegion.y * cellSize,
        recommendedRegion.width * cellSize,
        recommendedRegion.height * cellSize
      );
      ctx.setLineDash([]);

      // 绘制中心标记
      const centerX = (recommendedRegion.x + recommendedRegion.width / 2) * cellSize;
      const centerY = (recommendedRegion.y + recommendedRegion.height / 2) * cellSize;
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 3 / scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // 恢复状态
    ctx.restore();
  }, [pixelGrid, cellSize, scale, offset, showGrid, mode, highlightColorKey, 
      currentColorKey, markedCells, hoveredCell, recommendedRegion, 
      canvasWidth, canvasHeight, actualWidth, actualHeight]);

  // 处理鼠标/触摸坐标转换
  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / scale;
    const y = (clientY - rect.top - offset.y) / scale;

    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);

    if (gridX >= 0 && gridX < canvasWidth && gridY >= 0 && gridY < canvasHeight) {
      return { x: gridX, y: gridY, pixel: pixelGrid[gridY][gridX] };
    }

    return null;
  }, [offset, scale, cellSize, canvasWidth, canvasHeight, pixelGrid]);

  // 处理点击
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    if (mode === 'preview' && onCellClick) {
      onCellClick(coords.pixel, coords.x, coords.y);
    } else if (mode === 'edit' && onMarkCell) {
      onMarkCell(coords.x, coords.y);
    }
  }, [mode, getCanvasCoordinates, onCellClick, onMarkCell]);

  // 处理鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    
    if (coords) {
      setHoveredCell({ x: coords.x, y: coords.y });
      if (mode === 'preview' && onCellHover) {
        onCellHover(coords.pixel, coords.x, coords.y);
      }
    } else {
      setHoveredCell(null);
      if (mode === 'preview' && onCellHover) {
        onCellHover(null, 0, 0);
      }
    }
  }, [isPanning, lastPanPoint, getCanvasCoordinates, mode, onCellHover]);

  // 处理滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.1), 5);

    // 以鼠标位置为中心缩放
    const scaleChange = newScale / scale;
    const newOffsetX = mouseX - (mouseX - offset.x) * scaleChange;
    const newOffsetY = mouseY - (mouseY - offset.y) * scaleChange;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);

  // 处理平移
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setHoveredCell(null);
    if (mode === 'preview' && onCellHover) {
      onCellHover(null, 0, 0);
    }
  }, [mode, onCellHover]);

  // 触摸支持
  const touchState = useRef<{
    lastDistance: number;
    lastCenter: { x: number; y: number };
  }>({ lastDistance: 0, lastCenter: { x: 0, y: 0 } });

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      touchState.current = {
        lastDistance: distance,
        lastCenter: { x: centerX, y: centerY }
      };
    } else if (e.touches.length === 1) {
      const coords = getCanvasCoordinates(e.touches[0].clientX, e.touches[0].clientY);
      if (coords) {
        setHoveredCell({ x: coords.x, y: coords.y });
      }
    }
  }, [getCanvasCoordinates]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      // 缩放
      if (touchState.current.lastDistance > 0) {
        const scaleDelta = distance / touchState.current.lastDistance;
        const newScale = Math.min(Math.max(scale * scaleDelta, 0.1), 5);
        
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const canvasCenterX = centerX - rect.left;
          const canvasCenterY = centerY - rect.top;
          
          const scaleChange = newScale / scale;
          const newOffsetX = canvasCenterX - (canvasCenterX - offset.x) * scaleChange;
          const newOffsetY = canvasCenterY - (canvasCenterY - offset.y) * scaleChange;
          
          setScale(newScale);
          setOffset({ x: newOffsetX, y: newOffsetY });
        }
      }
      
      // 平移
      const deltaX = centerX - touchState.current.lastCenter.x;
      const deltaY = centerY - touchState.current.lastCenter.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      touchState.current = {
        lastDistance: distance,
        lastCenter: { x: centerX, y: centerY }
      };
    }
  }, [scale, offset]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      setHoveredCell(null);
    }
  }, []);

  // 设置画布尺寸
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      renderCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [renderCanvas, onCanvasReady]);

  // 渲染循环
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* 缩放控制按钮 */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setScale(prev => Math.min(prev * 1.2, 5))}
          className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
          aria-label="放大"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button
          onClick={() => setScale(prev => Math.max(prev / 1.2, 0.1))}
          className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
          aria-label="缩小"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="p-2 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
          aria-label="重置视图"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
      
      {/* 模式指示器 */}
      <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg">
        <span className="text-sm font-medium">
          {mode === 'preview' ? '预览模式' : '编辑模式'}
        </span>
      </div>
    </div>
  );
}