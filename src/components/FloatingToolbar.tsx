'use client';

import React from 'react';

interface FloatingToolbarProps {
  isManualColoringMode: boolean;
  isPaletteOpen: boolean;
  onTogglePalette: () => void;
  onExitManualMode: () => void;
  onToggleMagnifier: () => void;
  isMagnifierActive: boolean;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  isManualColoringMode,
  isPaletteOpen,
  onTogglePalette,
  onExitManualMode,
  onToggleMagnifier,
  isMagnifierActive
}) => {
  if (!isManualColoringMode) return null;

  return (
    <div className="fixed top-4 right-4 z-40 flex flex-col gap-2">
      {/* 调色盘开关按钮 */}
      <button
        onClick={onTogglePalette}
        className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
          isPaletteOpen
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
        }`}
        title={isPaletteOpen ? '关闭调色盘' : '打开调色盘'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
        </svg>
      </button>

      {/* 放大镜按钮 */}
      <button
        onClick={onToggleMagnifier}
        className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
          isMagnifierActive
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
        }`}
        title={isMagnifierActive ? '关闭放大镜' : '打开放大镜'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* 退出手动编辑模式按钮 */}
      <button
        onClick={onExitManualMode}
        className="w-12 h-12 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center"
        title="退出手动编辑模式"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default FloatingToolbar; 