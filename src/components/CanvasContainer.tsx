'use client';

import React, { useState, useCallback, useRef } from 'react';
import UnifiedCanvas, { CanvasMode } from './UnifiedCanvas';
import { MappedPixel } from '../utils/pixelation';
import { useEditMode } from '../hooks/useEditMode';
import { usePreviewMode } from '../hooks/usePreviewMode';
import { downloadImage } from '../utils/imageDownloader';
import { GridDownloadOptions } from '../types/downloadTypes';
import DownloadSettingsModal from './DownloadSettingsModal';
import { ColorSystem } from '../utils/colorSystemUtils';

interface CanvasContainerProps {
  pixelGrid: MappedPixel[][];
  cellSize: number;
  onPixelGridUpdate: (newGrid: MappedPixel[][]) => void;
  colorPalette: Array<{ key: string; hex: string; name?: string }>;
  selectedColorSystem: string;
}

export default function CanvasContainer({
  pixelGrid,
  cellSize,
  onPixelGridUpdate,
  colorPalette,
  selectedColorSystem,
}: CanvasContainerProps) {
  const [mode, setMode] = useState<CanvasMode>('preview');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState<GridDownloadOptions>({
    showGrid: true,
    gridInterval: 10,
    showCoordinates: true,
    gridLineColor: '#000000',
    includeStats: true,
    exportCsv: false
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 预览模式钩子
  const {
    selectedTool,
    selectedColorKey,
    highlightColorKey,
    replaceModeState,
    setSelectedTool,
    setSelectedColorKey,
    handleCellClick,
    toggleHighlight,
    resetToolState,
  } = usePreviewMode(pixelGrid, onPixelGridUpdate);

  // 编辑模式钩子
  const {
    currentColorKey,
    markedCells,
    recommendedRegion,
    recommendMode,
    isTimerRunning,
    elapsedTime,
    markCell,
    switchColor,
    setRecommendMode,
    calculateProgress,
    resetEditMode,
    toggleTimer,
  } = useEditMode(pixelGrid);

  // 处理画布准备完成
  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  // 切换模式
  const toggleMode = useCallback(() => {
    if (mode === 'preview') {
      // 切换到编辑模式
      resetToolState();
      setMode('edit');
      // 自动选择第一个颜色
      if (colorPalette.length > 0 && !currentColorKey) {
        switchColor(colorPalette[0].key);
      }
    } else {
      // 切换到预览模式
      resetEditMode();
      setMode('preview');
    }
  }, [mode, resetToolState, resetEditMode, colorPalette, currentColorKey, switchColor]);

  // 处理下载
  const handleDownload = useCallback(async (options: GridDownloadOptions) => {
    if (!canvasRef.current) return;
    
    setIsExporting(true);
    try {
      // 计算颜色统计和尺寸
      const colorCounts: { [key: string]: { count: number; color: string } } = {};
      let totalBeadCount = 0;
      
      pixelGrid.forEach(row => {
        row.forEach(pixel => {
          if (pixel.key && pixel.key !== 'transparent' && !pixel.isExternal) {
            if (!colorCounts[pixel.key]) {
              colorCounts[pixel.key] = { count: 0, color: pixel.color };
            }
            colorCounts[pixel.key].count++;
            totalBeadCount++;
          }
        });
      });

      // 创建一个简单的色板数组
      const activeBeadPalette = colorPalette.map(c => ({
        key: c.key,
        hex: c.hex,
        rgb: { r: 0, g: 0, b: 0 } // 简化处理
      }));

      await downloadImage({
        mappedPixelData: pixelGrid,
        gridDimensions: { N: pixelGrid.length, M: pixelGrid[0]?.length || 0 },
        colorCounts,
        totalBeadCount,
        options,
        activeBeadPalette,
        selectedColorSystem: selectedColorSystem as ColorSystem,
      });
    } finally {
      setIsExporting(false);
      setShowDownloadModal(false);
    }
  }, [pixelGrid, selectedColorSystem, colorPalette]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 编辑模式的进度信息
  const progress = mode === 'edit' ? calculateProgress() : null;

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          {/* 模式切换 */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMode}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
            >
              切换到{mode === 'preview' ? '编辑' : '预览'}模式
            </button>

            {/* 预览模式工具 */}
            {mode === 'preview' && (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTool('view')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      selectedTool === 'view'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title="查看"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSelectedTool('paint')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      selectedTool === 'paint'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title="上色"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSelectedTool('erase')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      selectedTool === 'erase'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title="擦除"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSelectedTool('replace')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      selectedTool === 'replace'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title="替换颜色"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </button>
                </div>

                {replaceModeState.isActive && (
                  <div className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
                    选择目标颜色进行替换
                  </div>
                )}
              </>
            )}

            {/* 编辑模式信息 */}
            {mode === 'edit' && progress && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    当前颜色：
                  </span>
                  <div
                    className="w-6 h-6 rounded border-2 border-gray-300"
                    style={{ backgroundColor: currentColorKey }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    进度：{progress.completed}/{progress.total} ({progress.percentage}%)
                  </span>
                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    用时：{formatTime(elapsedTime)}
                  </span>
                  <button
                    onClick={toggleTimer}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    title={isTimerRunning ? '暂停' : '继续'}
                  >
                    {isTimerRunning ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                </div>

                <select
                  value={recommendMode}
                  onChange={(e) => setRecommendMode(e.target.value as 'nearest' | 'largest' | 'edge-first')}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="nearest">最近优先</option>
                  <option value="largest">最大优先</option>
                  <option value="edge-first">边缘优先</option>
                </select>
              </>
            )}
          </div>

          {/* 导出按钮 */}
          <button
            onClick={() => setShowDownloadModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200"
            disabled={isExporting}
          >
            {isExporting ? '导出中...' : '导出图片'}
          </button>
        </div>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 relative">
        <UnifiedCanvas
          pixelGrid={pixelGrid}
          cellSize={cellSize}
          mode={mode}
          onCellClick={mode === 'preview' ? handleCellClick : undefined}
          onCellHover={mode === 'preview' ? () => {/* 处理悬停 */} : undefined}
          highlightColorKey={mode === 'preview' ? highlightColorKey : undefined}
          currentColorKey={mode === 'edit' ? currentColorKey : undefined}
          markedCells={mode === 'edit' ? markedCells : undefined}
          onMarkCell={mode === 'edit' ? markCell : undefined}
          recommendedRegion={mode === 'edit' ? recommendedRegion : undefined}
          onCanvasReady={handleCanvasReady}
          className="w-full h-full"
        />
      </div>

      {/* 底部颜色选择器 */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {colorPalette.map((color) => (
            <button
              key={color.key}
              onClick={() => {
                if (mode === 'preview') {
                  setSelectedColorKey(color.key);
                  if (selectedTool === 'view') {
                    toggleHighlight(color.key);
                  }
                } else {
                  switchColor(color.key);
                }
              }}
              className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 transition-all duration-200 ${
                (mode === 'preview' && selectedColorKey === color.key) ||
                (mode === 'edit' && currentColorKey === color.key)
                  ? 'border-blue-500 scale-110'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name || color.key}
            />
          ))}
        </div>
      </div>

      {/* 下载设置模态框 */}
      {showDownloadModal && (
        <DownloadSettingsModal
          isOpen={showDownloadModal}
          onClose={() => setShowDownloadModal(false)}
          options={downloadOptions}
          onOptionsChange={setDownloadOptions}
          onDownload={() => handleDownload(downloadOptions)}
        />
      )}
    </div>
  );
}