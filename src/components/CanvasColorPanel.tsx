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
    <div className="fixed inset-x-0 bottom-0 bg-white/98 backdrop-blur-xl border-t border-gray-200/40 shadow-2xl z-40 max-h-80 overflow-hidden flex flex-col">
      {/* 精简的标题栏 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <h3 className="text-sm font-medium text-gray-800">去杂色</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {sortedColors.filter(color => !removedColors.includes(color.hex)).length} 色
          </span>
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
      
      {/* 紧凑的颜色网格 */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="grid grid-cols-2 gap-1.5">
          {/* 当前画布颜色 - 紧凑布局 */}
          {sortedColors
            .filter(color => !removedColors.includes(color.hex)) // 过滤掉已移除的颜色
            .map(color => (
            <button
              key={color.hex}
              onClick={() => onColorRemove(color.hex)}
              className="flex items-center gap-2 p-2 hover:bg-red-50 rounded-md transition-all duration-150 group border border-transparent hover:border-red-200/60 active:scale-95"
            >
              {/* 颜色块 - 更小 */}
              <div 
                className="w-5 h-5 rounded border border-gray-200/60 flex-shrink-0"
                style={{ backgroundColor: color.hex }}
              />
              
              {/* 信息区域 */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-gray-800 truncate">
                  {color.key}
                </div>
                <div className="text-xs text-gray-500">
                  {color.count}粒
                </div>
              </div>
              
              {/* 删除图标 - 更小 */}
              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          ))}
          
          {/* 已移除颜色 - 更紧凑 */}
          {[...new Set(removedColors)].map(hex => { // 使用 Set 去重
            const key = getColorKeyByHex(hex, selectedColorSystem);
            return (
              <button
                key={hex}
                onClick={() => onColorRestore(hex)}
                className="flex items-center gap-2 p-2 bg-gray-50/60 hover:bg-green-50 rounded-md transition-all duration-150 group opacity-60 hover:opacity-100 border border-gray-200/40 hover:border-green-200/60 active:scale-95"
              >
                {/* 颜色块 - 带删除线 */}
                <div 
                  className="w-5 h-5 rounded border border-gray-300/60 flex-shrink-0 relative"
                  style={{ backgroundColor: hex }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-400/80"></div>
                  </div>
                </div>
                
                {/* 信息区域 */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-gray-500 line-through truncate">
                    {key}
                  </div>
                  <div className="text-xs text-gray-400">
                    已移除
                  </div>
                </div>
                
                {/* 恢复图标 */}
                <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
            );
          })}
        </div>
        
        {sortedColors.length === 0 && removedColors.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            暂无颜色数据
          </div>
        )}
      </div>
      
      {/* 底部操作提示 */}
      <div className="px-3 py-2 bg-gray-50/50 border-t border-gray-100/60">
        <div className="text-xs text-gray-500 text-center">
          点击颜色移除 · 点击已移除颜色恢复
        </div>
      </div>
    </div>
  );
};

export default CanvasColorPanel;