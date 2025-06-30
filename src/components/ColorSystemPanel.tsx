import React, { useState, useEffect } from 'react';
import { ColorSystem, colorSystemOptions, getAllHexValues, getColorKeyByHex } from '../utils/colorSystemUtils';

interface ColorSystemPanelProps {
  selectedColorSystem: ColorSystem;
  customPalette: Set<string>; // hex values
  onColorSystemChange: (system: ColorSystem) => void;
  onCustomPaletteChange: (palette: Set<string>) => void;
  onClose: () => void;
  onSettingsChange?: () => void; // 当设置改变时的回调，用于刷新画布
  onSwitchToPreview?: () => void; // 切换到预览模式的回调
}

const ColorSystemPanel: React.FC<ColorSystemPanelProps> = ({
  selectedColorSystem,
  customPalette,
  onColorSystemChange,
  onCustomPaletteChange,
  onClose,
  onSettingsChange,
  onSwitchToPreview
}) => {
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
      return colorKey !== '-';
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

  // 初始化时默认全折叠，切换色号系统时也全折叠
  React.useEffect(() => {
    if (sortedGroupKeys.length > 0) {
      setCollapsedGroups(new Set(sortedGroupKeys));
    }
  }, [selectedColorSystem, sortedGroupKeys.join(',')]);

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
    
    // 更新localStorage
    localStorage.setItem('customPalette', JSON.stringify(Array.from(validColors)));
    
    // 更新组件状态
    onCustomPaletteChange(validColors);
    
    // 1. 退出色板系统界面
    onClose();
    
    // 2. 切换到预览模式
    onSwitchToPreview?.();
    
    // 3. 重新生成像素图（使用新的色板设置）
    // 这会触发regeneratePixelArt，使用预览模式的所有设置重新生成
    setTimeout(() => {
      onSettingsChange?.();
    }, 100); // 稍微延迟确保状态更新完成
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


  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl flex flex-col shadow-2xl border border-gray-100">
        
        {/* 顶部栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="relative color-system-dropdown">
            <button
              onClick={() => setShowColorSystemDropdown(!showColorSystemDropdown)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="font-medium text-gray-700">{selectedColorSystem}</span>
              <svg className={`w-4 h-4 transition-transform duration-200 text-gray-500 ${showColorSystemDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showColorSystemDropdown && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-20 min-w-[200px] overflow-hidden backdrop-blur-sm">
                {colorSystemOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Switching to:', option.key);
                      
                      // 先更新色号系统
                      onColorSystemChange(option.key as ColorSystem);
                      localStorage.setItem('selectedColorSystem', option.key);
                      
                      // 切换色号系统时，从临时色板中剔除不存在的颜色
                      const validColors = new Set(
                        Array.from(tempCustomPalette).filter(hex => {
                          const colorKey = getColorKeyByHex(hex, option.key as ColorSystem);
                          return colorKey !== '-';
                        })
                      );
                      
                      // 检查色板是否真的改变了
                      const paletteChanged = validColors.size !== tempCustomPalette.size;
                      
                      setTempCustomPalette(validColors);
                      
                      // 只有在色板内容真的改变时才触发重新生成
                      if (paletteChanged) {
                        // 保存到 localStorage
                        localStorage.setItem('customPalette', JSON.stringify(Array.from(validColors)));
                        onCustomPaletteChange(validColors);
                        
                        // 使用 setTimeout 确保状态更新后再触发画布刷新
                        setTimeout(() => {
                          onSettingsChange?.();
                        }, 50);
                      }
                      
                      setShowColorSystemDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${
                      selectedColorSystem === option.key ? 'bg-gradient-to-r from-blue-50 to-purple-50 font-medium text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {option.key} - {option.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-light text-gray-500 tracking-wide">
              {tempCustomPalette.size}/{allColors.length}
            </span>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 rounded-xl transition-all duration-200 group"
            >
              <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>


        {/* 颜色网格 - 分组显示 */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedGroupKeys.map(groupKey => {
            const groupColors = groupedColors[groupKey];
            const isCollapsed = collapsedGroups.has(groupKey);
            const selectedInGroup = groupColors.filter(hex => tempCustomPalette.has(hex)).length;
            
            return (
              <div key={groupKey} className="mb-6">
                {/* 分组标题 */}
                <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
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
                    className="flex items-center gap-2 flex-1 hover:bg-white p-1 rounded transition-colors"
                  >
                    <svg className={`w-4 h-4 transition-transform text-gray-400 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium text-gray-700">{groupKey}</span>
                    <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto">
                      <span>{selectedInGroup}/{groupColors.length}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        selectedInGroup === 0 
                          ? 'bg-red-400' 
                          : selectedInGroup === groupColors.length 
                            ? 'bg-green-400' 
                            : 'bg-orange-400'
                      }`}></div>
                    </div>
                  </button>
                  
                  {/* 一键操作按钮 */}
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGroupSelectAll(groupKey);
                      }}
                      className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-600 rounded"
                      title="全选此组"
                    >
                      全选
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGroupClear(groupKey);
                      }}
                      className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded"
                      title="清空此组"
                    >
                      清空
                    </button>
                  </div>
                </div>
                
                {/* 颜色网格 */}
                {!isCollapsed && (
                  <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-14 lg:grid-cols-16 gap-4">
                    {groupColors.map(hex => {
                      const colorKey = getColorKeyByHex(hex, selectedColorSystem);
                      const isSelected = tempCustomPalette.has(hex);
                      
                      return (
                        <div key={hex} className="flex flex-col items-center">
                          <button
                            onClick={() => toggleColor(hex)}
                            className={`w-full aspect-square rounded-xl border-2 transition-all duration-200 transform hover:scale-105 ${
                              isSelected 
                                ? 'border-blue-400 shadow-lg shadow-blue-200/50 ring-2 ring-blue-100' 
                                : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={`${colorKey} - ${hex}`}
                          />
                          <span className={`text-xs mt-2 font-mono transition-all duration-200 ${
                            isSelected 
                              ? 'text-gray-800 font-semibold' 
                              : 'text-gray-400 font-medium'
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
        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleSaveCustomPalette}
            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorSystemPanel;