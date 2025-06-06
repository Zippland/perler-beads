import React, { useRef, useState, useCallback, useEffect } from 'react';

interface SelectionArea {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface MagnifierSelectionOverlayProps {
  isActive: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  gridDimensions: { N: number; M: number } | null;
  cellSize: number;
  onSelectionComplete: (area: SelectionArea) => void;
}

const MagnifierSelectionOverlay: React.FC<MagnifierSelectionOverlayProps> = ({
  isActive,
  canvasRef,
  gridDimensions,
  onSelectionComplete
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // 滚动禁用状态
  const scrollDisabledRef = useRef<boolean>(false);
  const savedScrollPositionRef = useRef<number>(0);

  // 禁用/启用页面滚动
  const preventScrolling = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const disableScroll = useCallback(() => {
    if (scrollDisabledRef.current) return; // 避免重复禁用
    
    // 保存当前滚动位置
    savedScrollPositionRef.current = window.scrollY;
    
    // 设置CSS样式
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // 阻止滚动事件（但不使用fixed定位，避免跳转问题）
    document.addEventListener('wheel', preventScrolling, { passive: false });
    document.addEventListener('touchmove', preventScrolling, { passive: false });
    
    scrollDisabledRef.current = true;
  }, [preventScrolling]);
  
  const enableScroll = useCallback(() => {
    if (!scrollDisabledRef.current) return; // 避免重复启用
    
    // 恢复CSS样式
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    
    // 移除事件监听器
    document.removeEventListener('wheel', preventScrolling);
    document.removeEventListener('touchmove', preventScrolling);
    
    scrollDisabledRef.current = false;
    // 不再强制恢复滚动位置，让浏览器保持自然状态
  }, [preventScrolling]);

  // 获取画布相对坐标
  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, [canvasRef]);

  // 将像素坐标转换为网格坐标
  const pixelToGrid = useCallback((x: number, y: number) => {
    if (!gridDimensions || !canvasRef.current) return null;
    
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    const cellWidth = canvasWidth / gridDimensions.N;
    const cellHeight = canvasHeight / gridDimensions.M;
    
    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);
    
    return {
      row: Math.max(0, Math.min(gridDimensions.M - 1, row)),
      col: Math.max(0, Math.min(gridDimensions.N - 1, col))
    };
  }, [gridDimensions, canvasRef]);

  // 处理鼠标事件
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isActive) return;
    
    const coords = getCanvasCoordinates(event.clientX, event.clientY);
    if (!coords) return;
    
    setIsSelecting(true);
    setSelectionStart(coords);
    setSelectionEnd(coords);
    disableScroll(); // 禁用滚动
    event.preventDefault();
  }, [isActive, getCanvasCoordinates, disableScroll]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isSelecting || !selectionStart) return;
    
    const coords = getCanvasCoordinates(event.clientX, event.clientY);
    if (!coords) return;
    
    setSelectionEnd(coords);
  }, [isSelecting, selectionStart, getCanvasCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !selectionStart || !selectionEnd) {
      enableScroll(); // 确保恢复滚动
      return;
    }
    
    const startGrid = pixelToGrid(selectionStart.x, selectionStart.y);
    const endGrid = pixelToGrid(selectionEnd.x, selectionEnd.y);
    
    if (startGrid && endGrid) {
      const area: SelectionArea = {
        startRow: Math.min(startGrid.row, endGrid.row),
        startCol: Math.min(startGrid.col, endGrid.col),
        endRow: Math.max(startGrid.row, endGrid.row),
        endCol: Math.max(startGrid.col, endGrid.col)
      };
      
      onSelectionComplete(area);
    }
    
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    enableScroll(); // 恢复滚动
  }, [isSelecting, selectionStart, selectionEnd, pixelToGrid, onSelectionComplete, enableScroll]);

  // 处理触摸事件
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!isActive) return;
    
    const touch = event.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;
    
    setIsSelecting(true);
    setSelectionStart(coords);
    setSelectionEnd(coords);
    disableScroll(); // 禁用滚动
    event.preventDefault();
  }, [isActive, getCanvasCoordinates, disableScroll]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!isSelecting || !selectionStart) return;
    
    const touch = event.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;
    
    setSelectionEnd(coords);
    event.preventDefault();
  }, [isSelecting, selectionStart, getCanvasCoordinates]);

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  // 事件监听器
  useEffect(() => {
    if (isSelecting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        enableScroll(); // 清理时恢复滚动
      };
    }
  }, [isSelecting, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd, enableScroll]);

  // 组件卸载时恢复滚动
  useEffect(() => {
    return () => {
      enableScroll();
    };
  }, [enableScroll]);

  // 当组件变为非活跃状态时恢复滚动
  useEffect(() => {
    if (!isActive) {
      enableScroll();
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  }, [isActive, enableScroll]);

  // 计算选择框的样式
  const getSelectionStyle = useCallback(() => {
    if (!selectionStart || !selectionEnd || !canvasRef.current) return {};
    
    const rect = canvasRef.current.getBoundingClientRect();
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);
    
    return {
      left: rect.left + minX,
      top: rect.top + minY,
      width: maxX - minX,
      height: maxY - minY,
      position: 'fixed' as const,
      border: '2px solid #10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      pointerEvents: 'none' as const,
      zIndex: 1000
    };
  }, [selectionStart, selectionEnd, canvasRef]);

  if (!isActive) return null;

  return (
    <>
      {/* 覆盖层 */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50"
        style={{ 
          cursor: 'crosshair',
          pointerEvents: isActive ? 'auto' : 'none'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
        onScroll={(e) => e.preventDefault()}
      />
      
      {/* 选择框 */}
      {isSelecting && selectionStart && selectionEnd && (
        <div style={getSelectionStyle()} />
      )}
    </>
  );
};

export default MagnifierSelectionOverlay; 