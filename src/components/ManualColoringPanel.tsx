import React from 'react';
import { getColorKeyByHex, ColorSystem } from '../utils/colorSystemUtils';

interface CanvasColorInfo {
  hex: string;
  key: string;
  count: number;
}

interface ManualColoringPanelProps {
  canvasColors: CanvasColorInfo[];
  selectedColorSystem: ColorSystem;
  selectedTool: 'brush' | 'eraser';
  selectedColor: string;
  onToolChange: (tool: 'brush' | 'eraser') => void;
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

const ManualColoringPanel: React.FC<ManualColoringPanelProps> = ({
  canvasColors,
  selectedColorSystem,
  selectedTool,
  selectedColor,
  onToolChange,
  onColorSelect,
  onClose
}) => {
  return (
    <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 shadow-lg z-40 flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <h3 className="text-sm font-medium text-gray-800">手动上色</h3>
        </div>
        
        {/* 工具选择 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onToolChange('brush')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              selectedTool === 'brush'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            画笔
          </button>
          <button
            onClick={() => onToolChange('eraser')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              selectedTool === 'eraser'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            橡皮擦
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* 颜色选择区域 - 仅在画笔模式下显示 */}
      {selectedTool === 'brush' && (
        <div className="px-3 py-2 max-h-32 overflow-y-auto">
          <div className="flex flex-wrap gap-1">
            {canvasColors.map(color => {
              const isSelected = selectedColor === color.hex;
              return (
                <button
                  key={color.hex}
                  onClick={() => onColorSelect(color.hex)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-100 border-blue-300 border-2'
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {/* 颜色块 */}
                  <div 
                    className="w-3 h-3 rounded border border-gray-300"
                    style={{ backgroundColor: color.hex }}
                  />
                  
                  {/* 色号 */}
                  <span className="font-mono text-gray-700">
                    {getColorKeyByHex(color.hex, selectedColorSystem)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualColoringPanel;