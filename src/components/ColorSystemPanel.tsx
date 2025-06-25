import React, { useState, useEffect } from 'react';
import { ColorSystem, colorSystemOptions, getAllHexValues, getColorKeyByHex } from '../utils/colorSystemUtils';

interface ColorSystemPanelProps {
  selectedColorSystem: ColorSystem;
  customPalette: Set<string>; // hex values
  onColorSystemChange: (system: ColorSystem) => void;
  onCustomPaletteChange: (palette: Set<string>) => void;
  onClose: () => void;
}

const ColorSystemPanel: React.FC<ColorSystemPanelProps> = ({
  selectedColorSystem,
  customPalette,
  onColorSystemChange,
  onCustomPaletteChange,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'custom'>('system');
  const [searchTerm, setSearchTerm] = useState('');
  const [tempCustomPalette, setTempCustomPalette] = useState<Set<string>>(new Set(customPalette));
  
  // 获取所有可用颜色
  const allColors = getAllHexValues();
  
  // 过滤颜色
  const filteredColors = allColors.filter(hex => {
    const colorKey = getColorKeyByHex(hex, selectedColorSystem);
    return colorKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
           hex.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // 保存自定义色板
  const handleSaveCustomPalette = () => {
    onCustomPaletteChange(tempCustomPalette);
    localStorage.setItem('customPalette', JSON.stringify(Array.from(tempCustomPalette)));
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">色板设置</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'system' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            色号系统
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'custom' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            自定义色板
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'system' ? (
            /* 色号系统选择 */
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">选择色号系统</h3>
              <div className="space-y-2">
                {colorSystemOptions.map(option => (
                  <label
                    key={option.key}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="colorSystem"
                      value={option.key}
                      checked={selectedColorSystem === option.key}
                      onChange={() => {
                        onColorSystemChange(option.key as ColorSystem);
                        localStorage.setItem('selectedColorSystem', option.key);
                      }}
                      className="mr-3"
                    />
                    <span className="font-medium">{option.name}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  当前选择：<span className="font-medium">{selectedColorSystem}</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  所有颜色显示将使用此色号系统
                </p>
              </div>
            </div>
          ) : (
            /* 自定义色板 */
            <div className="flex-1 flex flex-col">
              {/* 搜索和操作栏 */}
              <div className="p-4 space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜索颜色编号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg 
                    className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    已选择 {tempCustomPalette.size} / {allColors.length} 种颜色
                  </div>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {tempCustomPalette.size === allColors.length ? '取消全选' : '全选'}
                  </button>
                </div>
              </div>

              {/* 颜色网格 */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {filteredColors.map(hex => {
                    const colorKey = getColorKeyByHex(hex, selectedColorSystem);
                    const isSelected = tempCustomPalette.has(hex);
                    
                    return (
                      <button
                        key={hex}
                        onClick={() => toggleColor(hex)}
                        className={`relative p-2 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        title={`${colorKey} - ${hex}`}
                      >
                        <div
                          className="w-full aspect-square rounded mb-1"
                          style={{ backgroundColor: hex }}
                        />
                        <div className="text-xs text-center font-mono">
                          {colorKey}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 保存按钮 */}
              <div className="p-4 border-t bg-gray-50">
                <button
                  onClick={handleSaveCustomPalette}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  保存自定义色板
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColorSystemPanel;