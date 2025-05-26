'use client';

import React from 'react';
import { getDisplayColorKey, ColorSystem } from '../utils/colorSystemUtils';

// Define the structure of the color data expected by the palette
interface ColorData {
  key: string;
  color: string;
  isExternal?: boolean; // 添加 isExternal 属性以支持透明/橡皮擦功能
}

// 新增：颜色替换相关接口
interface ColorReplaceState {
  isActive: boolean;
  step: 'select-source' | 'select-target'; // 替换步骤：选择源颜色 | 选择目标颜色
  sourceColor?: ColorData; // 被替换的颜色
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
  // 新增：完整色板相关props
  fullPaletteColors?: ColorData[]; // 用户自定义色板中的所有颜色
  showFullPalette?: boolean; // 是否显示完整色板
  onToggleFullPalette?: () => void; // 切换完整色板显示
  // 新增：颜色替换相关props
  colorReplaceState?: ColorReplaceState; // 颜色替换状态
  onColorReplaceToggle?: () => void; // 切换颜色替换模式
  onColorReplace?: (sourceColor: ColorData, targetColor: ColorData) => void; // 执行颜色替换
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ 
  colors, 
  selectedColor, 
  onColorSelect,
  transparentKey,
  selectedColorSystem,
  isEraseMode,
  onEraseToggle,
  onHighlightColor,
  fullPaletteColors,
  showFullPalette,
  onToggleFullPalette,
  colorReplaceState,
  onColorReplaceToggle,
  onColorReplace
}) => {
  if (!colors || colors.length === 0) {
    // Apply dark mode text color
    return <p className="text-xs text-center text-gray-500 dark:text-gray-400 py-2">当前图纸无可用颜色。</p>;
  }

  // 确定要显示的颜色集合
  // 如果显示完整色板，需要过滤掉透明颜色（因为完整色板不包含透明色）
  const colorsToShow = showFullPalette && fullPaletteColors 
    ? [colors.find(c => transparentKey && c.key === transparentKey), ...fullPaletteColors].filter(Boolean) as ColorData[]
    : colors;

  return (
    // Apply dark mode styles to the container
    <div className="bg-white dark:bg-gray-900 rounded border border-blue-200 dark:border-gray-700">
      {/* 色板切换按钮区域 */}
      {fullPaletteColors && fullPaletteColors.length > 0 && onToggleFullPalette && (
        <div className="flex justify-center p-2 border-b border-blue-100 dark:border-gray-700">
          <button
            onClick={onToggleFullPalette}
            className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 flex items-center gap-1.5 ${
              showFullPalette
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {showFullPalette ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                只显示图中颜色
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
                展开完整色板 ({fullPaletteColors.length} 色)
              </>
            )}
          </button>
        </div>
      )}
      
      {/* 颜色替换状态提示 */}
      {colorReplaceState?.isActive && (
        <div className="p-3 border-b border-purple-100 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">颜色替换模式</span>
            </div>
            
            {colorReplaceState.step === 'select-source' ? (
              <div className="text-xs text-purple-600 dark:text-purple-400">
                <p className="mb-1">步骤 1/2：点击图中要被替换的颜色</p>
                <p className="text-gray-500 dark:text-gray-400">选择后将高亮显示该颜色的所有位置</p>
              </div>
            ) : (
              <div className="text-xs text-purple-600 dark:text-purple-400">
                <p className="mb-1">步骤 2/2：从下方色板选择替换成的颜色</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-gray-500 dark:text-gray-400">被替换的颜色：</span>
                  <div className="flex items-center gap-1">
                    <span
                      className="inline-block w-4 h-4 rounded border border-gray-400 dark:border-gray-500"
                      style={{ backgroundColor: colorReplaceState.sourceColor?.color }}
                    ></span>
                    <span className="font-mono text-xs">
                      {selectedColorSystem ? getDisplayColorKey(colorReplaceState.sourceColor?.color || '', selectedColorSystem) : colorReplaceState.sourceColor?.key}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 一键擦除状态提示 */}
      {isEraseMode && (
        <div className="p-3 border-b border-orange-100 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">背景擦除模式</span>
            </div>
            
            <div className="text-xs text-orange-600 dark:text-orange-400">
              <p className="mb-1">点击图中任意颜色，删除整个颜色块</p>
              <p className="text-gray-500 dark:text-gray-400">使用洪水填充算法，一次性擦除连通的相同颜色区域</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 橡皮擦选中状态提示 */}
      {selectedColor?.key === transparentKey && !isEraseMode && !colorReplaceState?.isActive && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">橡皮擦模式</span>
            </div>
            
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p className="mb-1">点击图中任意位置清除单个格子</p>
              <p className="text-gray-500 dark:text-gray-400">逐个删除不需要的颜色，不会影响其他格子</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 颜色按钮区域 */}
      <div className="flex flex-wrap justify-center gap-2 p-2">
        {/* 一键擦除按钮 */}
        {onEraseToggle && (
          <button
            onClick={onEraseToggle}
            className={`w-12 h-12 rounded border-2 flex-shrink-0 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 dark:focus:ring-blue-500 flex items-center justify-center ${
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
        
        {/* 颜色替换按钮 */}
        {onColorReplaceToggle && (
          <button
            onClick={onColorReplaceToggle}
            className={`w-12 h-12 rounded border-2 flex-shrink-0 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 dark:focus:ring-blue-500 flex items-center justify-center ${
              colorReplaceState?.isActive
                ? 'border-purple-500 bg-purple-100 dark:bg-purple-900 ring-2 ring-offset-1 ring-purple-400 dark:ring-purple-500 scale-110 shadow-md'
                : 'border-purple-300 dark:border-purple-600 bg-purple-100 dark:bg-purple-800 hover:border-purple-500 dark:hover:border-purple-400'
            }`}
            title={colorReplaceState?.isActive ? '退出颜色替换模式' : '颜色替换 (将图中A颜色全部替换为B颜色)'}
            aria-label={colorReplaceState?.isActive ? '退出颜色替换模式' : '开启颜色替换模式'}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 ${colorReplaceState?.isActive ? 'text-purple-600 dark:text-purple-400' : 'text-purple-600 dark:text-purple-400'}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
        )}
        
        {colorsToShow.map((colorData) => {
        // 检查当前颜色是否是透明/橡皮擦
        const isTransparent = transparentKey && colorData.key === transparentKey;
        const isSelected = selectedColor?.key === colorData.key;
        
        // 获取要显示的色号
        const displayColorKey = isTransparent 
          ? '' 
          : (selectedColorSystem ? getDisplayColorKey(colorData.color, selectedColorSystem) : colorData.key);
        
        // 获取对比色用于文字显示
        const getContrastColor = (hex: string): string => {
          const rgb = {
            r: parseInt(hex.slice(1, 3), 16),
            g: parseInt(hex.slice(3, 5), 16),
            b: parseInt(hex.slice(5, 7), 16)
          };
          // 计算亮度
          const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
          return luma > 0.5 ? '#000000' : '#FFFFFF';
        };
        
        return (
          <button
            key={colorData.key}
              onClick={() => {
                // 颜色替换模式下的特殊处理
                if (colorReplaceState?.isActive && colorReplaceState.step === 'select-target' && !isTransparent && onColorReplace && colorReplaceState.sourceColor) {
                  // 步骤2：选择目标颜色并执行替换
                  onColorReplace(colorReplaceState.sourceColor, colorData);
                  return;
                }
                
                // 正常的颜色选择逻辑
                onColorSelect(colorData);
                
                // 如果不是透明颜色且有高亮回调，触发高亮效果
                if (!isTransparent && onHighlightColor) {
                  onHighlightColor(colorData.color);
                }
              }}
            className={`relative w-12 h-12 rounded border-2 flex-shrink-0 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 dark:focus:ring-blue-500 flex items-center justify-center ${ 
              isSelected
                // Apply dark mode styles for selected state
                ? 'border-black dark:border-gray-100 ring-2 ring-offset-1 ring-blue-400 dark:ring-blue-500 scale-110 shadow-md'
                // Apply dark mode styles for default/hover state
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
            } ${isTransparent ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            style={isTransparent ? {} : { backgroundColor: colorData.color }}
            title={isTransparent 
              ? '选择橡皮擦 (清除单元格)' 
                : `选择 ${displayColorKey} (${colorData.color})`}
              aria-label={isTransparent ? '选择橡皮擦' : `选择颜色 ${displayColorKey}`}
          >
            {/* 如果是透明/橡皮擦按钮，显示叉号图标 */}
            {isTransparent ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // 显示色号文字
              <span 
                className="text-xs font-bold font-mono leading-none text-center px-1"
                style={{ 
                  color: getContrastColor(colorData.color),
                  textShadow: '0 0 2px rgba(0,0,0,0.5)',
                  wordBreak: 'break-all',
                  lineHeight: '1.1'
                }}
              >
                {displayColorKey}
              </span>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
};

export default ColorPalette; 