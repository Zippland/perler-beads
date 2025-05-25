'use client';

import React from 'react';
import { getDisplayColorKey, ColorSystem } from '../utils/colorSystemUtils';

// Define the structure of the color data expected by the palette
interface ColorData {
  key: string;
  color: string;
  isExternal?: boolean; // 添加 isExternal 属性以支持透明/橡皮擦功能
}

interface ColorPaletteProps {
  colors: ColorData[];
  selectedColor: ColorData | null;
  onColorSelect: (colorData: ColorData) => void;
  transparentKey?: string; // 添加可选参数，用于识别哪个是透明/橡皮擦
  selectedColorSystem?: ColorSystem; // 添加色号系统参数
  // 新增：一键擦除相关props
  isEraseMode?: boolean;
  onEraseToggle?: () => void;
  // 新增：高亮相关props
  onHighlightColor?: (colorHex: string) => void; // 触发高亮某个颜色
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ 
  colors, 
  selectedColor, 
  onColorSelect,
  transparentKey,
  selectedColorSystem,
  isEraseMode,
  onEraseToggle,
  onHighlightColor
}) => {
  if (!colors || colors.length === 0) {
    // Apply dark mode text color
    return <p className="text-xs text-center text-gray-500 dark:text-gray-400 py-2">当前图纸无可用颜色。</p>;
  }

  return (
    // Apply dark mode styles to the container
    <div className="flex flex-wrap justify-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-blue-200 dark:border-gray-700">
      {/* 一键擦除按钮 */}
      {onEraseToggle && (
        <button
          onClick={onEraseToggle}
          className={`w-8 h-8 rounded border-2 flex-shrink-0 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 dark:focus:ring-blue-500 flex items-center justify-center ${
            isEraseMode
              ? 'border-red-500 bg-red-100 dark:bg-red-900 ring-2 ring-offset-1 ring-red-400 dark:ring-red-500 scale-110 shadow-md'
              : 'border-orange-300 dark:border-orange-600 bg-orange-100 dark:bg-orange-800 hover:border-orange-500 dark:hover:border-orange-400'
          }`}
          title={isEraseMode ? '退出一键擦除模式' : '一键擦除 (洪水填充删除相同颜色)'}
          aria-label={isEraseMode ? '退出一键擦除模式' : '开启一键擦除模式'}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-5 w-5 ${isEraseMode ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
      
      {colors.map((colorData) => {
        // 检查当前颜色是否是透明/橡皮擦
        const isTransparent = transparentKey && colorData.key === transparentKey;
        const isSelected = selectedColor?.key === colorData.key;
        
        return (
          <button
            key={colorData.key}
            onClick={() => {
              onColorSelect(colorData);
              // 如果不是透明颜色且有高亮回调，触发高亮效果
              if (!isTransparent && onHighlightColor) {
                onHighlightColor(colorData.color);
              }
            }}
            className={`w-8 h-8 rounded border-2 flex-shrink-0 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 dark:focus:ring-blue-500 ${ 
              isSelected
                // Apply dark mode styles for selected state
                ? 'border-black dark:border-gray-100 ring-2 ring-offset-1 ring-blue-400 dark:ring-blue-500 scale-110 shadow-md'
                // Apply dark mode styles for default/hover state
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
            } ${isTransparent ? 'flex items-center justify-center bg-gray-100 dark:bg-gray-700' : ''}`} // Add background for transparent button
            style={isTransparent ? {} : { backgroundColor: colorData.color }}
            title={isTransparent 
              ? '选择橡皮擦 (清除单元格)' 
              : `选择 ${selectedColorSystem ? getDisplayColorKey(colorData.key, selectedColorSystem) : colorData.key} (${colorData.color})`}
            aria-label={isTransparent ? '选择橡皮擦' : `选择颜色 ${selectedColorSystem ? getDisplayColorKey(colorData.key, selectedColorSystem) : colorData.key}`}
          >
            {/* 如果是透明/橡皮擦按钮，显示叉号图标 */}
            {isTransparent && (
              // Apply dark mode icon color
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ColorPalette; 