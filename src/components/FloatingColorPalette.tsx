'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MappedPixel } from '../utils/pixelation';
import { TRANSPARENT_KEY } from '../utils/pixelEditingUtils';
import { ColorReplaceState } from '../hooks/useManualEditingState';
import { ColorSystem, getColorKeyByHex } from '../utils/colorSystemUtils';

interface FloatingColorPaletteProps {
  colors: { key: string; color: string }[];
  selectedColor: MappedPixel | null;
  onColorSelect: (colorData: { key: string; color: string; isExternal?: boolean }) => void;
  selectedColorSystem: ColorSystem;
  isEraseMode: boolean;
  onEraseToggle: () => void;
  fullPaletteColors: { key: string; color: string }[];
  showFullPalette: boolean;
  onToggleFullPalette: () => void;
  colorReplaceState: ColorReplaceState;
  onColorReplaceToggle: () => void;
  onColorReplace: (sourceColor: { key: string; color: string }, targetColor: { key: string; color: string }) => void;
  onHighlightColor: (colorHex: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isActive: boolean;
  onActivate: () => void;
}

const FloatingColorPalette: React.FC<FloatingColorPaletteProps> = ({
  colors,
  selectedColor,
  onColorSelect,
  selectedColorSystem,
  isEraseMode,
  onEraseToggle,
  fullPaletteColors,
  showFullPalette,
  onToggleFullPalette,
  colorReplaceState,
  onColorReplaceToggle,
  onColorReplace,
  onHighlightColor,
  isOpen,
  onToggleOpen,
  isActive,
  onActivate
}) => {
  // 计算初始位置，确保在屏幕内显示
  const getInitialPosition = () => ({
    x: Math.max(20, Math.min(20, window.innerWidth - 300)),
    y: Math.max(100, Math.min(100, window.innerHeight - 400))
  });
  
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const paletteRef = useRef<HTMLDivElement>(null);

  // 处理拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!paletteRef.current) return;
    
    onActivate(); // 激活调色板，置于最上层
    const rect = paletteRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  }, [onActivate]);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!paletteRef.current) return;
    
    onActivate(); // 激活调色板，置于最上层
    const rect = paletteRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    e.preventDefault();
  }, [onActivate]);

  // 处理移动
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;

      // 移除边界限制，允许自由拖动到任何位置
      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;

      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      // 恢复页面滚动
      document.body.style.overflow = '';
    };

    if (isDragging) {
      // 阻止页面滚动
      document.body.style.overflow = 'hidden';
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
        // 清理时恢复滚动
        document.body.style.overflow = '';
      };
    }
  }, [isDragging, dragOffset]);

  // 移除窗口大小变化时的边界调整，允许调色盘保持在任何位置

    // 每次打开调色盘时重置位置到屏幕内
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      setPosition(getInitialPosition());
    }
  }, [isOpen]);

  // 处理颜色点击
  const handleColorClick = (colorData: { key: string; color: string }) => {
    if (colorReplaceState.isActive && colorReplaceState.step === 'select-target' && colorReplaceState.sourceColor) {
      // 执行颜色替换
      onColorReplace(colorReplaceState.sourceColor, colorData);
    } else {
      // 高亮颜色
      onHighlightColor(colorData.color);
      // 选择颜色
      onColorSelect(colorData);
    }
  };

  const displayColors = showFullPalette ? fullPaletteColors : colors;

  // 如果调色盘关闭，完全不渲染
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={paletteRef}
      className={`fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 select-none ${
        isActive ? 'z-[60]' : 'z-[50]'
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: '280px',
        maxHeight: '400px'
      }}
      onClick={onActivate}
    >
      {/* 标题栏和控制按钮 */}
      <div
        className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-xl cursor-move"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">调色盘</span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* 关闭按钮 */}
          <button
            onClick={onToggleOpen}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="关闭调色盘"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-3 max-h-80 overflow-y-auto">
          {/* 模式状态指示器 */}
          {colorReplaceState.isActive && (
            <div className="mb-3 p-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg text-xs">
              <div className="flex items-center gap-1 text-orange-700 dark:text-orange-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span>
                  {colorReplaceState.step === 'select-source' ? '点击画布选择要替换的颜色' : '选择目标颜色'}
                </span>
              </div>
            </div>
          )}

          {/* 工具按钮行 */}
          <div className="flex gap-2 mb-3">
            {/* 橡皮擦按钮 */}
            <button
              onClick={() => handleColorClick({ key: TRANSPARENT_KEY, color: '#FFFFFF' })}
              className={`flex-1 p-2 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1 text-xs ${
                selectedColor?.key === TRANSPARENT_KEY
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              橡皮擦
            </button>

            {/* 一键擦除按钮 */}
            <button
              onClick={onEraseToggle}
              className={`flex-1 p-2 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1 text-xs ${
                isEraseMode
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              区域擦除
            </button>

            {/* 颜色替换按钮 */}
            <button
              onClick={onColorReplaceToggle}
              className={`flex-1 p-2 rounded-lg border transition-all duration-200 flex items-center justify-center gap-1 text-xs ${
                colorReplaceState.isActive
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              批量替换
            </button>
          </div>

          {/* 色板切换 */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={onToggleFullPalette}
              className="w-full text-xs py-2 px-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {showFullPalette ? `当前色板 (${colors.length})` : `完整色板 (${fullPaletteColors.length})`}
            </button>
          </div>

          {/* 颜色网格 */}
          <div className="grid grid-cols-6 gap-1.5">
            {displayColors.map((colorData) => {
              const isSelected = selectedColor?.key === colorData.key && selectedColor?.color === colorData.color;
              const displayKey = getColorKeyByHex(colorData.color, selectedColorSystem);
              
              return (
                <button
                  key={`${colorData.key}-${colorData.color}`}
                  onClick={() => handleColorClick(colorData)}
                  className={`group relative aspect-square rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800 scale-110'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: colorData.color }}
                  title={`${displayKey} (${colorData.color})`}
                >
                  {/* 选中指示器 */}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full shadow-lg"></div>
                    </div>
                  )}
                  
                  {/* 悬停时显示色号 */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {displayKey}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 当前选中颜色信息 */}
          {selectedColor && selectedColor.key !== TRANSPARENT_KEY && (
            <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
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
  );
};

export default FloatingColorPalette; 