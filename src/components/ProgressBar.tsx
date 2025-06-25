import React from 'react';

interface ProgressBarProps {
  progressPercentage: number;
  recommendedCell?: { row: number; col: number } | null;
  colorInfo?: {
    color: string;
    name: string;
    total: number;
    completed: number;
  };
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progressPercentage,
  recommendedCell
}) => {
  // 生成7个圆点来表示进度
  const progressDots = Array.from({ length: 7 }, (_, index) => {
    const threshold = (index + 1) * (100 / 7);
    const isFilled = progressPercentage >= threshold;
    
    return (
      <div
        key={index}
        className={`w-2 h-2 rounded-full ${
          isFilled ? 'bg-blue-500' : 'bg-gray-300'
        }`}
      />
    );
  });

  return (
    <div className="h-8 bg-white border-b border-gray-200 px-4 py-1.5 flex items-center justify-between">
      <div className="flex items-center space-x-1.5">
        {progressDots}
        <span className="ml-1.5 text-xs font-medium text-gray-700">
          {progressPercentage}%
        </span>
      </div>
      
      <div className="text-xs text-gray-500">
        {recommendedCell ? (
          <span>下一块 {recommendedCell.row + 1},{recommendedCell.col + 1}</span>
        ) : (
          <span>已完成</span>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
