import React from 'react';

interface SettingsPanelProps {
  guidanceMode: 'nearest' | 'largest' | 'edge-first';
  onGuidanceModeChange: (mode: 'nearest' | 'largest' | 'edge-first') => void;
  gridSectionInterval: number;
  onGridSectionIntervalChange: (interval: number) => void;
  showSectionLines: boolean;
  onShowSectionLinesChange: (show: boolean) => void;
  sectionLineColor: string;
  onSectionLineColorChange: (color: string) => void;
  enableCelebration: boolean;
  onEnableCelebrationChange: (enable: boolean) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  guidanceMode,
  onGuidanceModeChange,
  gridSectionInterval,
  onGridSectionIntervalChange,
  showSectionLines,
  onShowSectionLinesChange,
  sectionLineColor,
  onSectionLineColorChange,
  enableCelebration,
  onEnableCelebrationChange,
  onClose
}) => {
  // 分割线颜色选项
  const sectionLineColors = [
    { color: '#007acc', name: '蓝色' },
    { color: '#28a745', name: '绿色' },
    { color: '#dc3545', name: '红色' },
    { color: '#6f42c1', name: '紫色' },
    { color: '#fd7e14', name: '橙色' },
    { color: '#6c757d', name: '灰色' }
  ];
  
  // 自定义滑块样式
  const sliderStyles = `
    <style>
      .slider-thumb::-webkit-slider-thumb {
        appearance: none;
        width: 24px;
        height: 24px;
        background: #3b82f6;
        cursor: pointer;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }
      .slider-thumb::-moz-range-thumb {
        width: 24px;
        height: 24px;
        background: #3b82f6;
        cursor: pointer;
        border-radius: 50%;
        border: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }
    </style>
  `;
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: sliderStyles }} />
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
        <div className="w-full sm:w-80 h-full bg-white shadow-lg flex flex-col">
        {/* 头部 - 移动端优化 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">设置</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 设置内容 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 引导设置 */}
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-3">智能引导</h3>
            <div className="space-y-3">
              <label className="flex items-start p-3 -mx-3 rounded-lg active:bg-gray-50">
                <input
                  type="radio"
                  name="guidanceMode"
                  value="nearest"
                  checked={guidanceMode === 'nearest'}
                  onChange={(e) => onGuidanceModeChange(e.target.value as 'nearest')}
                  className="mt-1 mr-3 text-blue-600 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">最近优先</div>
                  <div className="text-sm text-gray-500 mt-0.5">推荐距离最近的格子</div>
                </div>
              </label>

              <label className="flex items-start p-3 -mx-3 rounded-lg active:bg-gray-50">
                <input
                  type="radio"
                  name="guidanceMode"
                  value="largest"
                  checked={guidanceMode === 'largest'}
                  onChange={(e) => onGuidanceModeChange(e.target.value as 'largest')}
                  className="mt-1 mr-3 text-blue-600 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">大块优先</div>
                  <div className="text-sm text-gray-500 mt-0.5">优先推荐大色块区域</div>
                </div>
              </label>

              <label className="flex items-start p-3 -mx-3 rounded-lg active:bg-gray-50">
                <input
                  type="radio"
                  name="guidanceMode"
                  value="edge-first"
                  checked={guidanceMode === 'edge-first'}
                  onChange={(e) => onGuidanceModeChange(e.target.value as 'edge-first')}
                  className="mt-1 mr-3 text-blue-600 w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">边缘优先</div>
                  <div className="text-sm text-gray-500 mt-0.5">先完成边缘，再填充内部</div>
                </div>
              </label>
            </div>
          </div>

          {/* 显示设置 */}
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-3">显示设置</h3>
            <div className="space-y-4">
              {/* 分割线开关 */}
              <label className="flex items-center justify-between p-3 -mx-3 rounded-lg active:bg-gray-50">
                <div className="flex-1 mr-3">
                  <div className="text-sm font-medium text-gray-700">显示分割线</div>
                  <div className="text-sm text-gray-500 mt-0.5">将画布分割成区块帮助定位</div>
                </div>
                <input
                  type="checkbox"
                  checked={showSectionLines}
                  onChange={(e) => onShowSectionLinesChange(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              {/* 只有开启分割线时才显示后续选项 */}
              {showSectionLines && (
                <>
                  {/* 分割线间隔 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      分割间隔
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="range"
                        min="5"
                        max="20"
                        value={gridSectionInterval}
                        onChange={(e) => onGridSectionIntervalChange(parseInt(e.target.value))}
                        className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                      />
                      <span className="text-sm font-medium text-gray-700 min-w-[3rem]">
                        {gridSectionInterval} 格
                      </span>
                    </div>
                  </div>

                  {/* 分割线颜色 */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      分割线颜色
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {sectionLineColors.map((colorOption) => (
                        <button
                          key={colorOption.color}
                          onClick={() => onSectionLineColorChange(colorOption.color)}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${
                            sectionLineColor === colorOption.color
                              ? 'border-gray-800 scale-110'
                              : 'border-gray-300 hover:border-gray-500'
                          }`}
                          style={{ backgroundColor: colorOption.color }}
                          title={colorOption.name}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 庆祝动画开关 */}
              <label className="flex items-center justify-between p-3 -mx-3 rounded-lg active:bg-gray-50">
                <div className="flex-1 mr-3">
                  <div className="text-sm font-medium text-gray-700">庆祝动画</div>
                  <div className="text-sm text-gray-500 mt-0.5">完成颜色时显示撒花效果</div>
                </div>
                <input
                  type="checkbox"
                  checked={enableCelebration}
                  onChange={(e) => onEnableCelebrationChange(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>
            </div>
          </div>



          {/* 进度重置 */}
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-3">数据管理</h3>
            <div className="space-y-3">
              <button className="w-full py-3 px-4 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 active:bg-orange-300 transition-colors text-sm font-medium">
                导出进度数据
              </button>
              
              <button className="w-full py-3 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 active:bg-red-300 transition-colors text-sm font-medium">
                重置所有进度
              </button>
            </div>
          </div>

          {/* 关于信息 */}
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-3">关于</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>专心拼豆模式 v1.0</p>
              <p>专为手机设计的拼豆助手</p>
              <div className="pt-2 text-sm text-gray-500">
                <p>💡 提示：长按格子可以快速标记</p>
                <p>💡 提示：双指缩放可以查看细节</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SettingsPanel;