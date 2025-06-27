import React, { useState, useEffect } from 'react';
import { ColorSystem, colorSystemOptions, getAllHexValues, getColorKeyByHex } from '../utils/colorSystemUtils';

interface ColorSystemPanelProps {
  selectedColorSystem: ColorSystem;
  customPalette: Set<string>; // hex values
  onColorSystemChange: (system: ColorSystem) => void;
  onCustomPaletteChange: (palette: Set<string>) => void;
  onClose: () => void;
  onSettingsChange?: () => void; // 当设置改变时的回调，用于刷新画布
}

const ColorSystemPanel: React.FC<ColorSystemPanelProps> = ({
  selectedColorSystem,
  customPalette,
  onColorSystemChange,
  onCustomPaletteChange,
  onClose,
  onSettingsChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempCustomPalette, setTempCustomPalette] = useState<Set<string>>(new Set(customPalette));
  const [showColorSystemDropdown, setShowColorSystemDropdown] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  
  // 获取所有可用颜色
  const allColors = getAllHexValues();
  
  // 自然排序函数（支持数字排序）
  const naturalSort = (a: string, b: string) => {
    return a.localeCompare(b, undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  };

  // 分组函数
  const getGroupKey = (colorKey: string) => {
    if (/^[A-Za-z]/.test(colorKey)) {
      // 字母开头，按首字母分组
      return colorKey.charAt(0).toUpperCase();
    } else if (/^\d/.test(colorKey)) {
      // 数字开头，按十位数分组
      const num = parseInt(colorKey);
      const groupStart = Math.floor(num / 10) * 10;
      return `${groupStart}-${groupStart + 9}`;
    } else {
      // 其他字符开头
      return '其他';
    }
  };

  // 过滤和分组颜色
  const filteredColors = allColors
    .filter(hex => {
      const colorKey = getColorKeyByHex(hex, selectedColorSystem);
      // 剔除色号为"-"的颜色（表示当前色号系统下不存在）
      if (colorKey === '-') return false;
      
      return colorKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
             hex.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const keyA = getColorKeyByHex(a, selectedColorSystem);
      const keyB = getColorKeyByHex(b, selectedColorSystem);
      return naturalSort(keyA, keyB);
    });

  // 按组分类
  const groupedColors = filteredColors.reduce((groups, hex) => {
    const colorKey = getColorKeyByHex(hex, selectedColorSystem);
    const groupKey = getGroupKey(colorKey);
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(hex);
    
    return groups;
  }, {} as Record<string, string[]>);

  // 按组键排序
  const sortedGroupKeys = Object.keys(groupedColors).sort((a, b) => {
    // 字母组优先，然后是数字组，最后是其他
    const isLetterA = /^[A-Z]$/.test(a);
    const isLetterB = /^[A-Z]$/.test(b);
    const isNumberA = /^\d/.test(a);
    const isNumberB = /^\d/.test(b);
    
    if (isLetterA && !isLetterB) return -1;
    if (!isLetterA && isLetterB) return 1;
    if (isNumberA && !isNumberB && !isLetterB) return -1;
    if (!isNumberA && isNumberB && !isLetterA) return 1;
    
    return naturalSort(a, b);
  });

  // 初始化时默认全折叠
  React.useEffect(() => {
    if (sortedGroupKeys.length > 0 && collapsedGroups.size === 0) {
      setCollapsedGroups(new Set(sortedGroupKeys));
    }
  }, [sortedGroupKeys.join(',')]);

  // 分组操作函数
  const handleGroupSelectAll = (groupKey: string) => {
    const groupColors = groupedColors[groupKey];
    const newPalette = new Set(tempCustomPalette);
    groupColors.forEach(hex => newPalette.add(hex));
    setTempCustomPalette(newPalette);
  };

  const handleGroupClear = (groupKey: string) => {
    const groupColors = groupedColors[groupKey];
    const newPalette = new Set(tempCustomPalette);
    groupColors.forEach(hex => newPalette.delete(hex));
    setTempCustomPalette(newPalette);
  };

  // 保存自定义色板
  const handleSaveCustomPalette = () => {
    // 从色板中剔除在当前色号系统下不存在的颜色（色号为"-"）
    const validColors = new Set(
      Array.from(tempCustomPalette).filter(hex => {
        const colorKey = getColorKeyByHex(hex, selectedColorSystem);
        return colorKey !== '-';
      })
    );
    
    onCustomPaletteChange(validColors);
    localStorage.setItem('customPalette', JSON.stringify(Array.from(validColors)));
    onSettingsChange?.(); // 触发画布刷新
  };

  // 加载保存的自定义色板
  useEffect(() => {
    const saved = localStorage.getItem('customPalette');
    if (saved) {
      try {
        const palette = new Set<string>(JSON.parse(saved));
        setTempCustomPalette(palette);
        onCustomPaletteChange(palette);
      } catch (e) {
        console.error('Failed to load custom palette:', e);
      }
    }
  }, [onCustomPaletteChange]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showColorSystemDropdown && !target.closest('.color-system-dropdown')) {
        setShowColorSystemDropdown(false);
      }
    };

    if (showColorSystemDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorSystemDropdown]);

  // 切换颜色选择
  const toggleColor = (hex: string) => {
    const newPalette = new Set(tempCustomPalette);
    if (newPalette.has(hex)) {
      newPalette.delete(hex);
    } else {
      newPalette.add(hex);
    }
    setTempCustomPalette(newPalette);
  };

  // 全选/全不选
  const handleSelectAll = () => {
    if (tempCustomPalette.size === allColors.length) {
      setTempCustomPalette(new Set());
    } else {
      setTempCustomPalette(new Set(allColors));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-white rounded-lg flex flex-col shadow-lg">
        
        {/* 顶部栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="relative color-system-dropdown">
            <button
              onClick={() => setShowColorSystemDropdown(!showColorSystemDropdown)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              <span className="font-medium">{selectedColorSystem}</span>
              <svg className={`w-4 h-4 transition-transform ${showColorSystemDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showColorSystemDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-20 min-w-[200px]">
                {colorSystemOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Switching to:', option.key);
                      onColorSystemChange(option.key as ColorSystem);
                      localStorage.setItem('selectedColorSystem', option.key);
                      
                      // 切换色号系统时，从临时色板中剔除不存在的颜色
                      const validColors = new Set(
                        Array.from(tempCustomPalette).filter(hex => {
                          const colorKey = getColorKeyByHex(hex, option.key as ColorSystem);
                          return colorKey !== '-';
                        })
                      );
                      setTempCustomPalette(validColors);
                      
                      onSettingsChange?.();
                      setShowColorSystemDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                      selectedColorSystem === option.key ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    {option.key} - {option.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {tempCustomPalette.size}/{allColors.length}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="搜索颜色..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              {tempCustomPalette.size === allColors.length ? '清空' : '全选'}
            </button>
          </div>
        </div>

        {/* 颜色网格 - 分组显示 */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedGroupKeys.map(groupKey => {
            const groupColors = groupedColors[groupKey];
            const isCollapsed = collapsedGroups.has(groupKey);
            const selectedInGroup = groupColors.filter(hex => tempCustomPalette.has(hex)).length;
            
            return (
              <div key={groupKey} className="mb-6">
                {/* 分组标题 */}
                <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded">
                  <button
                    onClick={() => {
                      const newCollapsed = new Set(collapsedGroups);
                      if (isCollapsed) {
                        newCollapsed.delete(groupKey);
                      } else {
                        newCollapsed.add(groupKey);
                      }
                      setCollapsedGroups(newCollapsed);
                    }}
                    className="flex items-center gap-2 flex-1 hover:bg-gray-100 p-1 rounded transition-colors"
                  >
                    <svg className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium text-gray-700">{groupKey}</span>
                    <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto">
                      <span>{selectedInGroup}/{groupColors.length}</span>
                      {selectedInGroup > 0 && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </button>
                  
                  {/* 一键操作按钮 */}
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGroupSelectAll(groupKey);
                      }}
                      className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      title="全选此组"
                    >
                      全选
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGroupClear(groupKey);
                      }}
                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                      title="清空此组"
                    >
                      清空
                    </button>
                  </div>
                </div>
                
                {/* 颜色网格 */}
                {!isCollapsed && (
                  <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16 gap-3">
                    {groupColors.map(hex => {
                      const colorKey = getColorKeyByHex(hex, selectedColorSystem);
                      const isSelected = tempCustomPalette.has(hex);
                      
                      return (
                        <div key={hex} className="flex flex-col items-center">
                          <button
                            onClick={() => toggleColor(hex)}
                            className={`w-full aspect-square rounded border-2 transition-all ${
                              isSelected 
                                ? 'border-blue-500 shadow-md' 
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={`${colorKey} - ${hex}`}
                          />
                          <span className={`text-xs mt-1 font-mono transition-colors ${
                            isSelected 
                              ? 'text-gray-800 font-medium' 
                              : 'text-gray-400'
                          }`}>
                            {colorKey}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t">
          <button
            onClick={handleSaveCustomPalette}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorSystemPanel;