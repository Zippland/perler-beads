'use client';

import React, { useState, useEffect } from 'react';
import { PaletteColor } from '../utils/pixelation';
import { PaletteSelections } from '../utils/localStorageUtils';
import { getDisplayColorKey, ColorSystem } from '../utils/colorSystemUtils';

// 对颜色进行分组的工具函数，按前缀分组
function groupColorsByPrefix(colors: PaletteColor[], selectedColorSystem: ColorSystem): Record<string, PaletteColor[]> {
  const groups: Record<string, PaletteColor[]> = {};
  
  colors.forEach(color => {
    const displayKey = getDisplayColorKey(color.key, selectedColorSystem);
    
    let prefix: string;
    if (selectedColorSystem === '盼盼' || selectedColorSystem === '咪小窝') {
      // 对于纯数字的色号系统，按数字范围分组
      if (/^\d+$/.test(displayKey)) {
        const num = parseInt(displayKey, 10);
        if (num <= 20) {
          prefix = '1-20';
        } else if (num <= 50) {
          prefix = '21-50';
        } else if (num <= 100) {
          prefix = '51-100';
        } else if (num <= 200) {
          prefix = '101-200';
        } else {
          prefix = '200+';
        }
      } else {
        prefix = '其他';
      }
    } else {
      // 对于有字母前缀的色号系统，按字母前缀分组
      prefix = displayKey.match(/^[A-Z]+/)?.[0] || '其他';
    }
    
    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(color);
  });
  
  // 对每个组内的颜色按键进行排序
  Object.keys(groups).forEach(prefix => {
    groups[prefix].sort((a, b) => {
      const displayKeyA = getDisplayColorKey(a.key, selectedColorSystem);
      const displayKeyB = getDisplayColorKey(b.key, selectedColorSystem);
      
      if (selectedColorSystem === '盼盼' || selectedColorSystem === '咪小窝') {
        // 对于纯数字色号，按数字大小排序
        const numA = parseInt(displayKeyA, 10) || 0;
        const numB = parseInt(displayKeyB, 10) || 0;
        return numA - numB;
      } else {
        // 对于有字母前缀的色号，按字母+数字排序
        const numA = parseInt(displayKeyA.replace(/^[A-Z]+/, ''), 10) || 0;
        const numB = parseInt(displayKeyB.replace(/^[A-Z]+/, ''), 10) || 0;
        return numA - numB;
      }
    });
  });
  
  return groups;
}

interface CustomPaletteEditorProps {
  allColors: PaletteColor[];
  currentSelections: PaletteSelections;
  onSelectionChange: (key: string, isSelected: boolean) => void;
  onApplyPreset: (presetKey: string) => void;
  onSaveCustomPalette: () => void;
  onClose: () => void;
  paletteOptions: Record<string, { name: string; keys: string[] }>;
  onExportCustomPalette: () => void;
  onImportCustomPalette: () => void;
  selectedColorSystem: ColorSystem;
}

const CustomPaletteEditor: React.FC<CustomPaletteEditorProps> = ({
  allColors,
  currentSelections,
  onSelectionChange,
  onApplyPreset,
  onSaveCustomPalette,
  onClose,
  paletteOptions,
  onExportCustomPalette,
  onImportCustomPalette,
  selectedColorSystem,
}) => {
  // 用于跟踪当前展开的颜色组
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCount, setSelectedCount] = useState(0);
  
  // 计算已选择的颜色数量
  useEffect(() => {
    const count = Object.values(currentSelections).filter(Boolean).length;
    setSelectedCount(count);
  }, [currentSelections]);
  
  // 根据搜索词过滤颜色
  const filteredColors = searchTerm 
    ? allColors.filter(color => {
        const originalKey = color.key.toLowerCase();
        const displayKey = getDisplayColorKey(color.key, selectedColorSystem).toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return originalKey.includes(searchLower) || displayKey.includes(searchLower);
      })
    : allColors;
  
  // 对过滤后的颜色进行分组
  const colorGroups = groupColorsByPrefix(filteredColors, selectedColorSystem);
  
  // 切换组展开状态
  const toggleGroup = (prefix: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [prefix]: !prev[prefix]
    }));
  };
  
  // 切换所有颜色的选择状态
  const toggleAllColors = (selected: boolean) => {
    allColors.forEach(color => {
      onSelectionChange(color.hex.toUpperCase(), selected);
    });
  };
  
  // 切换一个组内所有颜色的选择状态
  const toggleGroupColors = (prefix: string, selected: boolean) => {
    colorGroups[prefix].forEach(color => {
      onSelectionChange(color.hex.toUpperCase(), selected);
    });
  };
  
  return (
    <div className="flex flex-col h-full max-h-[calc(90vh-80px)]">
      {/* 头部 */}
      <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
          </svg>
          色板管理中心 <span className="ml-2 text-sm text-blue-500 dark:text-blue-400">({selectedCount} 色)</span>
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* 搜索和预设 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <div className="relative">
            <input
              type="text"
              placeholder="搜索色号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pl-9 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => {
              if (e.target.value) {
                onApplyPreset(e.target.value);
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
            value=""
          >
            <option value="" disabled>选择预设色板...</option>
            {Object.entries(paletteOptions).map(([key, { name }]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* 说明文本 */}
      <div className="mb-4 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md border border-blue-100 dark:border-blue-800/30">
        <p className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          在此选择要使用的拼豆色系。您可以选择预设色板，然后根据需要手动添加或删除特定色号。完成后点击底部的&quot;保存并应用&quot;按钮。
        </p>
      </div>
      
      {/* 快捷操作按钮 */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <button
          onClick={() => toggleAllColors(true)}
          className="px-3 py-1.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50"
        >
          全选
        </button>
        <button
          onClick={() => toggleAllColors(false)}
          className="px-3 py-1.5 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50"
        >
          全不选
        </button>
        <button
          onClick={onImportCustomPalette}
          className="px-3 py-1.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          导入配置
        </button>
        <button
          onClick={onExportCustomPalette}
          className="px-3 py-1.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出配置
        </button>
      </div>
      
      {/* 颜色列表 */}
      <div className="flex-1 overflow-y-auto pr-1">
        {Object.keys(colorGroups).sort().map(prefix => (
          <div key={prefix} className="mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* 组标题 */}
            <div 
              className="flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750"
              onClick={() => toggleGroup(prefix)}
            >
              <div className="flex items-center">
                <span className="font-medium text-gray-800 dark:text-gray-200">{prefix} 系列</span>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({colorGroups[prefix].length} 色)
                </span>
              </div>
              
              <div className="flex items-center">
                {/* 组操作按钮 */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupColors(prefix, true);
                  }}
                  className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 mr-2"
                >
                  全选
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupColors(prefix, false);
                  }}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 mr-2"
                >
                  全不选
                </button>
                
                {/* 展开/收起图标 */}
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 text-gray-500 dark:text-gray-400 transform transition-transform ${expandedGroups[prefix] ? 'rotate-180' : ''}`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* 组内容 */}
            {expandedGroups[prefix] && (
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {colorGroups[prefix].map(color => (
                  <label 
                    key={color.key} 
                    className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 dark:hover:bg-gray-750 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!currentSelections[color.hex.toUpperCase()]}
                      onChange={(e) => onSelectionChange(color.hex.toUpperCase(), e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
                    />
                    <div
                      className="w-6 h-6 rounded-sm border border-gray-300 dark:border-gray-600 flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{getDisplayColorKey(color.key, selectedColorSystem)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* 底部按钮 */}
      <div className="mt-4 pt-3 border-t dark:border-gray-700 flex justify-between">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          取消
        </button>
        <button
          onClick={onSaveCustomPalette}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          保存并应用
        </button>
      </div>
    </div>
  );
};

export default CustomPaletteEditor; 