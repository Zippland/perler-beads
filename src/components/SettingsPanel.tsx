import React from 'react';

interface SettingsPanelProps {
  guidanceMode: 'nearest' | 'largest' | 'edge-first';
  onGuidanceModeChange: (mode: 'nearest' | 'largest' | 'edge-first') => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  guidanceMode,
  onGuidanceModeChange,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
      <div className="w-80 max-w-[90vw] h-full bg-white shadow-lg flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">设置</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
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
              <label className="flex items-center">
                <input
                  type="radio"
                  name="guidanceMode"
                  value="nearest"
                  checked={guidanceMode === 'nearest'}
                  onChange={(e) => onGuidanceModeChange(e.target.value as 'nearest')}
                  className="mr-3 text-blue-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">最近优先</div>
                  <div className="text-xs text-gray-500">推荐距离最近的格子</div>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="guidanceMode"
                  value="largest"
                  checked={guidanceMode === 'largest'}
                  onChange={(e) => onGuidanceModeChange(e.target.value as 'largest')}
                  className="mr-3 text-blue-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">大块优先</div>
                  <div className="text-xs text-gray-500">优先推荐大色块区域</div>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="guidanceMode"
                  value="edge-first"
                  checked={guidanceMode === 'edge-first'}
                  onChange={(e) => onGuidanceModeChange(e.target.value as 'edge-first')}
                  className="mr-3 text-blue-600"
                />
                <div>
                  <div className="text-sm font-medium text-gray-700">边缘优先</div>
                  <div className="text-xs text-gray-500">先完成边缘，再填充内部</div>
                </div>
              </label>
            </div>
          </div>

          {/* 显示设置 */}
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-3">显示设置</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">显示网格线</div>
                  <div className="text-xs text-gray-500">显示格子边框</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="h-4 w-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">显示色号</div>
                  <div className="text-xs text-gray-500">在格子内显示色号</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="h-4 w-4 text-blue-600 rounded"
                />
              </label>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  网格透明度
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="80"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>透明</span>
                  <span>不透明</span>
                </div>
              </div>
            </div>
          </div>

          {/* 反馈设置 */}
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-3">反馈设置</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">震动反馈</div>
                  <div className="text-xs text-gray-500">完成格子时震动提示</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="h-4 w-4 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">声音提示</div>
                  <div className="text-xs text-gray-500">完成格子时播放音效</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={false}
                  className="h-4 w-4 text-blue-600 rounded"
                />
              </label>
            </div>
          </div>

          {/* 进度重置 */}
          <div>
            <h3 className="text-base font-medium text-gray-800 mb-3">数据管理</h3>
            <div className="space-y-3">
              <button className="w-full py-2 px-4 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm">
                导出进度数据
              </button>
              
              <button className="w-full py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm">
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
              <div className="pt-2 text-xs text-gray-500">
                <p>💡 提示：长按格子可以快速标记</p>
                <p>💡 提示：双指缩放可以查看细节</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;