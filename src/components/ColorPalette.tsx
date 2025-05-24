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
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ 
  colors, 
  selectedColor, 
  onColorSelect,
  transparentKey,
  selectedColorSystem
}) => {
  if (!colors || colors.length === 0) {
    // Apply dark mode text color
    return <p className="text-xs text-center text-gray-500 dark:text-gray-400 py-2">当前图纸无可用颜色。</p>;
  }

  return (
    // Apply dark mode styles to the container
    <div className="flex flex-wrap justify-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-blue-200 dark:border-gray-700">
      {colors.map((colorData) => {
        // 检查当前颜色是否是透明/橡皮擦
        const isTransparent = transparentKey && colorData.key === transparentKey;
        const isSelected = selectedColor?.key === colorData.key;
        
        return (
          <button
            key={colorData.key}
            onClick={() => onColorSelect(colorData)}
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