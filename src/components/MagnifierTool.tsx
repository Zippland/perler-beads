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
  const [magnifierPosition, setMagnifierPosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
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
    
    // 设置画布的显示尺寸，确保不会太大
    const maxDisplayWidth = 400;
    const maxDisplayHeight = 400;
    const displayWidth = Math.min(canvas.width, maxDisplayWidth);
    const displayHeight = Math.min(canvas.height, maxDisplayHeight);
    
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

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

  // 处理拖拽移动
  const handleTitleBarMouseDown = useCallback((event: React.MouseEvent) => {
    // 只有点击在标题栏区域且不是按钮时才开始拖拽
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return; // 点击按钮时不拖拽
    }
    
    setIsDragging(true);
    event.preventDefault();
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isDragging && magnifierRef.current) {
      const rect = magnifierRef.current.getBoundingClientRect();
      const newX = Math.max(0, Math.min(window.innerWidth - rect.width, event.clientX - rect.width / 2));
      const newY = Math.max(0, Math.min(window.innerHeight - rect.height, event.clientY - rect.height / 2));
      setMagnifierPosition({ x: newX, y: newY });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
            top: magnifierPosition.y,
            maxWidth: '500px',
            maxHeight: '500px'
          }}
        >
          {/* 标题栏 */}
          <div 
            className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-t-xl cursor-move"
            onMouseDown={handleTitleBarMouseDown}
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
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
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