import React from 'react';
import { PixelationMode, MappedPixel } from '../utils/pixelation';

interface ColorInfo {
  color: string;
  name: string;
  total: number;
  completed: number;
}

interface PreviewToolbarProps {
  gridWidth: number;
  colorMergeThreshold: number;
  pixelationMode: PixelationMode;
  removeBackground: boolean;
  availableColors: ColorInfo[];
  mappedPixelData: MappedPixel[][] | null;
  isProcessing: boolean;
  onGridWidthChange: (width: number) => void;
  onColorMergeThresholdChange: (threshold: number) => void;
  onPixelationModeChange: (mode: PixelationMode) => void;
  onRemoveBackgroundChange: (remove: boolean) => void;
  onRegenerate: () => void;
}

const PreviewToolbar: React.FC<PreviewToolbarProps> = ({
  gridWidth,
  colorMergeThreshold,
  pixelationMode,
  removeBackground,
  availableColors,
  mappedPixelData,
  isProcessing,
  onGridWidthChange,
  onColorMergeThresholdChange,
  onPixelationModeChange,
  onRemoveBackgroundChange,
  onRegenerate
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-xl border-t border-gray-200/50">
      {/* 控制项区域 */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-2">
          {/* 网格宽度 */}
          <div className="relative">
            <div className="space-y-1.5">
              <label className="block text-[11px] text-gray-500 text-center">横轴格子数</label>
              <input
                type="text"
                value={gridWidth === 0 ? '' : gridWidth}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    onGridWidthChange(0);
                  } else {
                    const num = Number(val);
                    if (!isNaN(num)) {
                      onGridWidthChange(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  let finalValue = val;
                  
                  // 先确定最终值
                  if (isNaN(val) || val < 10) {
                    finalValue = 10;
                  } else if (val > 300) {
                    finalValue = 300;
                  }
                  
                  // 只在值需要修正时才更新
                  if (finalValue !== val || isNaN(val)) {
                    onGridWidthChange(finalValue);
                  }
                  
                  // 使用 setTimeout 确保状态更新完成后再渲染
                  setTimeout(() => {
                    onRegenerate();
                  }, 0);
                }}
                className="w-full h-8 px-0 text-center text-lg font-light text-gray-900 bg-transparent border-0 focus:outline-none focus:text-black transition-colors duration-200"
              />
            </div>
          </div>

          {/* 颜色合并 */}
          <div className="relative">
            <div className="space-y-1.5">
              <label className="block text-[11px] text-gray-500 text-center">颜色合并阈值</label>
              <input
                type="text"
                value={colorMergeThreshold === 0 ? '' : colorMergeThreshold}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    onColorMergeThresholdChange(0);
                  } else {
                    const num = Number(val);
                    if (!isNaN(num)) {
                      onColorMergeThresholdChange(num);
                    }
                  }
                }}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  let finalValue = val;
                  
                  // 先确定最终值
                  if (isNaN(val) || val < 0) {
                    finalValue = 0;
                  } else if (val > 450) {
                    finalValue = 450;
                  }
                  
                  // 只在值需要修正时才更新
                  if (finalValue !== val || isNaN(val)) {
                    onColorMergeThresholdChange(finalValue);
                  }
                  
                  // 使用 setTimeout 确保状态更新完成后再渲染
                  setTimeout(() => {
                    onRegenerate();
                  }, 0);
                }}
                className="w-full h-8 px-0 text-center text-lg font-light text-gray-900 bg-transparent border-0 focus:outline-none focus:text-black transition-colors duration-200"
              />
            </div>
          </div>

          {/* 算法模式 */}
          <div className="relative">
            <div className="space-y-1.5">
              <label className="block text-[11px] text-gray-500 text-center">渲染算法</label>
              <button
                onClick={() => {
                  const newMode = pixelationMode === PixelationMode.Dominant 
                    ? PixelationMode.Average 
                    : PixelationMode.Dominant;
                  onPixelationModeChange(newMode);
                }}
                className="w-full h-8 flex items-center justify-center relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gray-100 rounded-full scale-90 group-hover:scale-100 transition-transform duration-200"></div>
                <span className="relative text-xs font-medium text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                  {pixelationMode === PixelationMode.Dominant ? '主导色' : '平均色'}
                </span>
              </button>
            </div>
          </div>

          {/* 背景处理 */}
          <div className="relative">
            <div className="space-y-1.5">
              <label className="block text-[11px] text-gray-500 text-center">去背景</label>
              <button
                onClick={() => {
                  onRemoveBackgroundChange(!removeBackground);
                  onRegenerate();
                }}
                className="w-full h-8 relative"
              >
                <div className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                     style={{ backgroundColor: removeBackground ? '#000' : '#e5e7eb' }}>
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      removeBackground ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewToolbar;