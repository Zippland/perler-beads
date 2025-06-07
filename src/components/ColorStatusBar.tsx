import React from 'react';

interface ColorStatusBarProps {
  currentColor: string;
  colorInfo?: {
    color: string;
    name: string;
    total: number;
    completed: number;
  };
  progressPercentage: number;
}

const ColorStatusBar: React.FC<ColorStatusBarProps> = ({
  currentColor,
  colorInfo,
  progressPercentage
}) => {
  if (!colorInfo) {
    return (
      <div className="h-12 bg-white border-b border-gray-200 px-4 py-2 flex items-center">
        <div className="text-gray-500">请选择颜色</div>
      </div>
    );
  }

  const estimatedTime = Math.ceil((colorInfo.total - colorInfo.completed) * 0.1); // 假设每个格子0.5分钟

  return (
    <div className="h-12 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-gray-300"
          style={{ backgroundColor: currentColor }}
        />
        <div className="text-sm font-mono font-bold text-gray-700 px-2">
          {colorInfo.name}
        </div>
        <div className="flex flex-col">
          <div className="text-sm font-medium text-gray-800">
            {colorInfo.completed}/{colorInfo.total}
          </div>
          <div className="text-xs text-gray-500">
            预计还需 {estimatedTime}分钟
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-lg font-bold text-blue-600">
          {progressPercentage}%
        </div>
      </div>
    </div>
  );
};

export default ColorStatusBar;
