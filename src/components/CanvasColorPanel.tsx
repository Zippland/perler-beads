import React from 'react';
import { getColorKeyByHex, ColorSystem } from '../utils/colorSystemUtils';

interface CanvasColorInfo {
  hex: string;
  key: string;
  count: number;
}

interface CanvasColorPanelProps {
  canvasColors: CanvasColorInfo[];
  removedColors: string[];
  selectedColorSystem: ColorSystem;
  onColorRemove: (hex: string) => void;
  onColorRestore: (hex: string) => void;
  onClose: () => void;
}

const CanvasColorPanel: React.FC<CanvasColorPanelProps> = ({
  canvasColors,
  removedColors,
  selectedColorSystem,
  onColorRemove,
  onColorRestore,
  onClose
}) => {
  // 按数量从少到多排序
  const sortedColors = [...canvasColors].sort((a, b) => a.count - b.count);

  return (
    <div className="bg-white/95 backdrop-blur-lg border-t border-gray-200/30 px-4 py-3 max-h-64 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">画布颜色</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {/* 当前画布颜色 */}
        {sortedColors.map(color => (
          <button
            key={color.hex}
            onClick={() => onColorRemove(color.hex)}
            className="flex items-center gap-3 p-2 hover:bg-red-50/50 rounded-lg transition-all duration-200 active:bg-red-100/60 group"
          >
            {/* 颜色块 */}
            <div 
              className="w-6 h-6 rounded-lg border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: color.hex }}
            />
            
            {/* 色号名称 */}
            <span className="text-sm font-mono text-gray-700 min-w-[3rem]">
              {color.key}
            </span>
            
            {/* 数量 */}
            <span className="text-xs text-gray-500 ml-auto">
              {color.count}粒
            </span>
            
            {/* 删除图标 */}
            <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ))}
        
        {/* 已移除颜色区域 */}
        {removedColors.length > 0 && (
          <>
            <div className="border-t border-gray-300/50 pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-500">已移除</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            </div>
            
            {removedColors.map(hex => {
              const key = getColorKeyByHex(hex, selectedColorSystem);
              return (
                <button
                  key={hex}
                  onClick={() => onColorRestore(hex)}
                  className="flex items-center gap-3 p-2 bg-gray-50/80 hover:bg-green-50/50 rounded-lg transition-all duration-200 active:bg-green-100/60 group opacity-60 hover:opacity-100"
                >
                  {/* 颜色块 */}
                  <div 
                    className="w-6 h-6 rounded-lg border border-gray-300 flex-shrink-0 relative"
                    style={{ backgroundColor: hex }}
                  >
                    {/* 删除线标识 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-400 rotate-45"></div>
                    </div>
                  </div>
                  
                  {/* 色号名称 */}
                  <span className="text-sm font-mono text-gray-500 min-w-[3rem] line-through">
                    {key}
                  </span>
                  
                  {/* 恢复图标 */}
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
              );
            })}
          </>
        )}
      </div>
      
      {sortedColors.length === 0 && removedColors.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          暂无颜色数据
        </div>
      )}
    </div>
  );
};

export default CanvasColorPanel;