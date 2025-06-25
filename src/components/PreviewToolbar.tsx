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
    <div className="bg-white border-t border-gray-200">
      {/* 控制项区域 */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin">
          {/* 网格宽度 */}
          <div className="flex-shrink-0 bg-gray-50 rounded-lg px-3 py-2 min-w-[64px]">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">宽度</div>
              <input
                type="number"
                min="20"
                max="200"
                value={gridWidth}
                onChange={(e) => {
                  const val = e.target.value;
                  // 允许输入空值或任何数字
                  onGridWidthChange(val === '' ? 0 : Number(val));
                }}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  // 处理空值或无效值
                  if (isNaN(val) || val < 20) {
                    onGridWidthChange(20);
                  } else if (val > 200) {
                    onGridWidthChange(200);
                  }
                  onRegenerate();
                }}
                className="w-12 px-1 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 颜色合并 */}
          <div className="flex-shrink-0 bg-gray-50 rounded-lg px-3 py-2 min-w-[64px]">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">合并</div>
              <input
                type="number"
                min="0"
                max="100"
                value={colorMergeThreshold}
                onChange={(e) => {
                  const val = e.target.value;
                  // 允许输入空值或任何数字
                  onColorMergeThresholdChange(val === '' ? 0 : Number(val));
                }}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  // 处理空值或无效值
                  if (isNaN(val) || val < 0) {
                    onColorMergeThresholdChange(0);
                  } else if (val > 100) {
                    onColorMergeThresholdChange(100);
                  }
                  onRegenerate();
                }}
                className="w-12 px-1 py-1 text-xs text-center border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* 算法模式 */}
          <div className="flex-shrink-0 bg-gray-50 rounded-lg px-3 py-2 min-w-[64px]">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">算法</div>
              <button
                onClick={() => {
                  // 切换模式
                  const newMode = pixelationMode === PixelationMode.Dominant 
                    ? PixelationMode.Average 
                    : PixelationMode.Dominant;
                  onPixelationModeChange(newMode);
                }}
                className="px-3 py-1 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                {pixelationMode === PixelationMode.Dominant ? '主导' : '平均'}
              </button>
            </div>
          </div>

          {/* 背景处理 */}
          <div className="flex-shrink-0 bg-gray-50 rounded-lg px-3 py-2 min-w-[64px]">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">背景</div>
              <button
                onClick={() => {
                  onRemoveBackgroundChange(!removeBackground);
                  onRegenerate();
                }}
                className={`px-2 py-1 text-xs rounded ${
                  removeBackground
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                {removeBackground ? '去除' : '保留'}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 信息显示区域 */}
      <div className="px-3 py-2 bg-gray-50/50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-3">
            <span>{availableColors.length} 种颜色</span>
            <span>
              {mappedPixelData ? `${mappedPixelData[0]?.length || 0} × ${mappedPixelData.length}` : '0 × 0'} 像素
            </span>
          </div>
          
          {isProcessing && (
            <div className="flex items-center gap-2 text-blue-600">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>处理中</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewToolbar;