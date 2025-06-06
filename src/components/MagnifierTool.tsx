import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MappedPixel } from '../utils/pixelation';
import { getColorKeyByHex, ColorSystem } from '../utils/colorSystemUtils';

interface MagnifierToolProps {
  isActive: boolean;
  onToggle: () => void;
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  selectedColor: MappedPixel | null;
  selectedColorSystem: ColorSystem;
  onPixelEdit: (row: number, col: number, colorData: { key: string; color: string }) => void;
  cellSize: number;
  selectionArea: SelectionArea | null;
  onClearSelection: () => void;
}

interface SelectionArea {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

const MagnifierTool: React.FC<MagnifierToolProps> = ({
  isActive,
  onToggle,
  mappedPixelData,
  selectedColor,
  selectedColorSystem,
  onPixelEdit,
  selectionArea,
  onClearSelection
}) => {
  // 计算初始位置，确保在屏幕中央
  const getInitialPosition = () => ({
    x: Math.max(50, (window.innerWidth - 400) / 2),
    y: Math.max(50, (window.innerHeight - 400) / 2)
  });
  
  const [magnifierPosition, setMagnifierPosition] = useState<{ x: number; y: number }>(getInitialPosition);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const magnifierRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 计算选择区域的尺寸
  const getSelectionDimensions = useCallback(() => {
    if (!selectionArea) return { width: 0, height: 0 };
    return {
      width: Math.abs(selectionArea.endCol - selectionArea.startCol) + 1,
      height: Math.abs(selectionArea.endRow - selectionArea.startRow) + 1
    };
  }, [selectionArea]);

  // 渲染放大视图
  const renderMagnifiedView = useCallback(() => {
    if (!selectionArea || !mappedPixelData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getSelectionDimensions();
    const magnifiedCellSize = 20; // 放大后每个像素的大小
    
    // 设置画布的实际尺寸
    canvas.width = width * magnifiedCellSize;
    canvas.height = height * magnifiedCellSize;
    
    // 保持真实尺寸，不压缩
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 渲染放大的像素
    const startRow = Math.min(selectionArea.startRow, selectionArea.endRow);
    const endRow = Math.max(selectionArea.startRow, selectionArea.endRow);
    const startCol = Math.min(selectionArea.startCol, selectionArea.endCol);
    const endCol = Math.max(selectionArea.startCol, selectionArea.endCol);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (row >= 0 && row < mappedPixelData.length && col >= 0 && col < mappedPixelData[0].length) {
          const pixel = mappedPixelData[row][col];
          const canvasRow = row - startRow;
          const canvasCol = col - startCol;
          
          // 绘制像素
          ctx.fillStyle = pixel.color;
          ctx.fillRect(
            canvasCol * magnifiedCellSize,
            canvasRow * magnifiedCellSize,
            magnifiedCellSize,
            magnifiedCellSize
          );

          // 绘制网格线
          ctx.strokeStyle = '#e0e0e0';
          ctx.lineWidth = 1;
          ctx.strokeRect(
            canvasCol * magnifiedCellSize,
            canvasRow * magnifiedCellSize,
            magnifiedCellSize,
            magnifiedCellSize
          );
        }
      }
    }
  }, [selectionArea, mappedPixelData, getSelectionDimensions]);

  // 处理放大视图点击
  const handleMagnifiedClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectionArea || !mappedPixelData || !selectedColor || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // 获取点击在画布上的相对位置（考虑缩放）
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const magnifiedCellSize = 20;
    const clickedCol = Math.floor(x / magnifiedCellSize);
    const clickedRow = Math.floor(y / magnifiedCellSize);

    const startRow = Math.min(selectionArea.startRow, selectionArea.endRow);
    const startCol = Math.min(selectionArea.startCol, selectionArea.endCol);
    
    const actualRow = startRow + clickedRow;
    const actualCol = startCol + clickedCol;

    // 确保点击在有效范围内
    if (actualRow >= 0 && actualRow < mappedPixelData.length && 
        actualCol >= 0 && actualCol < mappedPixelData[0].length) {
      onPixelEdit(actualRow, actualCol, selectedColor);
    }
  }, [selectionArea, mappedPixelData, selectedColor, onPixelEdit]);

  // 处理拖拽移动 - 鼠标事件
  const handleTitleBarMouseDown = useCallback((event: React.MouseEvent) => {
    // 只有点击在标题栏区域且不是按钮时才开始拖拽
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return; // 点击按钮时不拖拽
    }
    
    if (magnifierRef.current) {
      const rect = magnifierRef.current.getBoundingClientRect();
      // 记录鼠标相对于窗口左上角的偏移
      setDragOffset({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
    
    setIsDragging(true);
    // 阻止页面滚动
    document.body.style.overflow = 'hidden';
    event.preventDefault();
  }, []);

  // 处理拖拽移动 - 触摸事件
  const handleTitleBarTouchStart = useCallback((event: React.TouchEvent) => {
    // 只有点击在标题栏区域且不是按钮时才开始拖拽
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return; // 点击按钮时不拖拽
    }
    
    const touch = event.touches[0];
    if (!touch) return;
    
    if (magnifierRef.current) {
      const rect = magnifierRef.current.getBoundingClientRect();
      // 记录触摸相对于窗口左上角的偏移
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
    }
    
    setIsDragging(true);
    // 阻止页面滚动
    document.body.style.overflow = 'hidden';
    event.preventDefault();
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging) {
      event.preventDefault();
      event.stopPropagation();
      // 计算新位置，保持鼠标相对于窗口的偏移不变，不限制边界
      const newX = event.clientX - dragOffset.x;
      const newY = event.clientY - dragOffset.y;
      setMagnifierPosition({ x: newX, y: newY });
    }
  }, [isDragging, dragOffset]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (isDragging) {
      event.preventDefault();
      event.stopPropagation();
      const touch = event.touches[0];
      if (!touch) return;
      
      // 计算新位置，保持触摸相对于窗口的偏移不变，不限制边界
      const newX = touch.clientX - dragOffset.x;
      const newY = touch.clientY - dragOffset.y;
      setMagnifierPosition({ x: newX, y: newY });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // 恢复页面滚动
    document.body.style.overflow = '';
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    // 恢复页面滚动
    document.body.style.overflow = '';
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        // 清理时恢复滚动
        document.body.style.overflow = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // 重新渲染放大视图
  useEffect(() => {
    renderMagnifiedView();
  }, [renderMagnifiedView]);

  if (!isActive) return null;

  return (
    <>
      {/* 选择区域提示 */}
      {!selectionArea && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>在画布上拖拽选择要放大的区域</span>
          </div>
        </div>
      )}

      {/* 放大视图窗口 */}
      {selectionArea && (
        <div
          ref={magnifierRef}
          className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 z-50 select-none"
          style={{
            left: magnifierPosition.x,
            top: magnifierPosition.y
          }}
        >
          {/* 标题栏 */}
          <div 
            className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-t-xl cursor-move"
            onMouseDown={handleTitleBarMouseDown}
            onTouchStart={handleTitleBarTouchStart}
          >
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm font-medium">放大镜 ({getSelectionDimensions().width}×{getSelectionDimensions().height})</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* 重新选择按钮 */}
              <button
                onClick={onClearSelection}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="重新选择区域"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              {/* 关闭按钮 */}
              <button
                onClick={onToggle}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="关闭放大镜"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 放大视图内容 */}
          <div className="p-3">
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-auto max-h-96">
              <canvas
                ref={canvasRef}
                onClick={handleMagnifiedClick}
                className="cursor-crosshair block"
              />
            </div>
            
            {/* 当前选中颜色信息 */}
            {selectedColor && (
              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className="w-4 h-4 rounded border border-gray-300 dark:border-gray-500"
                    style={{ backgroundColor: selectedColor.color }}
                  ></div>
                  <span className="text-gray-700 dark:text-gray-300">
                    当前: {getColorKeyByHex(selectedColor.color, selectedColorSystem)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MagnifierTool; 