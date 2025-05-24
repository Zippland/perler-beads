import React from 'react';
import { getDisplayColorKey, ColorSystem } from '../utils/colorSystemUtils';

interface TooltipData {
  x: number;
  y: number;
  key: string;
  color: string;
}

interface GridTooltipProps {
  tooltipData: TooltipData | null;
  selectedColorSystem?: ColorSystem;
}

const GridTooltip: React.FC<GridTooltipProps> = ({ tooltipData, selectedColorSystem = 'MARD' }) => {
  if (!tooltipData) return null;

  return (
    <div
      className="absolute bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none flex items-center space-x-1.5 z-50"
      style={{
        left: `${tooltipData.x}px`, 
        top: `${tooltipData.y - 25}px`, // 向上偏移，使提示框显示在鼠标上方
        transform: 'translate(-50%, -100%)', // 水平居中，不再垂直偏移
        whiteSpace: 'nowrap',
      }}
    >
      <span
        className="inline-block w-3 h-3 rounded-sm border border-gray-400 dark:border-gray-500 flex-shrink-0"
        style={{ backgroundColor: tooltipData.color }}
      ></span>
      <span className="font-mono font-semibold">{getDisplayColorKey(tooltipData.key, selectedColorSystem)}</span>
    </div>
  );
};

export default GridTooltip; 