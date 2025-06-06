'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MappedPixel } from '../../utils/pixelation';
import { 
  getAllConnectedRegions, 
  isRegionCompleted, 
  getRegionCenter, 
  sortRegionsByDistance, 
  sortRegionsBySize,
  getConnectedRegion
} from '../../utils/floodFillUtils';
import FocusCanvas from '../../components/FocusCanvas';
import ColorStatusBar from '../../components/ColorStatusBar';
import ProgressBar from '../../components/ProgressBar';
import ToolBar from '../../components/ToolBar';
import ColorPanel from '../../components/ColorPanel';
import SettingsPanel from '../../components/SettingsPanel';

interface FocusModeState {
  // 当前状态
  currentColor: string;
  selectedCell: { row: number; col: number } | null;
  
  // 画布状态
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  
  // 进度状态
  completedCells: Set<string>;
  colorProgress: Record<string, { completed: number; total: number }>;
  
  // 引导状态 - 改为区域推荐
  recommendedRegion: { row: number; col: number }[] | null;
  recommendedCell: { row: number; col: number } | null; // 保留用于定位显示
  guidanceMode: 'nearest' | 'largest' | 'edge-first';
  
  // UI状态
  showColorPanel: boolean;
  showSettingsPanel: boolean;
  isPaused: boolean;
}

export default function FocusMode() {
  // 从localStorage或URL参数获取像素数据
  const [mappedPixelData, setMappedPixelData] = useState<MappedPixel[][] | null>(null);
  const [gridDimensions, setGridDimensions] = useState<{ N: number; M: number } | null>(null);

  // 专心模式状态
  const [focusState, setFocusState] = useState<FocusModeState>({
    currentColor: '',
    selectedCell: null,
    canvasScale: 1,
    canvasOffset: { x: 0, y: 0 },
    completedCells: new Set<string>(),
    colorProgress: {},
    recommendedRegion: null,
    recommendedCell: null,
    guidanceMode: 'nearest',
    showColorPanel: false,
    showSettingsPanel: false,
    isPaused: false
  });

  // 可用颜色列表
  const [availableColors, setAvailableColors] = useState<Array<{
    color: string;
    name: string;
    total: number;
    completed: number;
  }>>([]);

  // 从localStorage加载数据
  useEffect(() => {
    const savedPixelData = localStorage.getItem('focusMode_pixelData');
    const savedGridDimensions = localStorage.getItem('focusMode_gridDimensions');
    const savedColorCounts = localStorage.getItem('focusMode_colorCounts');

    if (savedPixelData && savedGridDimensions && savedColorCounts) {
      try {
        const pixelData = JSON.parse(savedPixelData);
        const dimensions = JSON.parse(savedGridDimensions);
        const colorCounts = JSON.parse(savedColorCounts);

        setMappedPixelData(pixelData);
        setGridDimensions(dimensions);

        // 计算颜色进度
                const colors = Object.entries(colorCounts).map(([colorKey, colorData]) => {
          const data = colorData as { color: string; count: number };
          return {
            color: data.color,
            name: colorKey, // 使用色号作为名称
            total: data.count,
            completed: 0
          };
        });
        setAvailableColors(colors);

        // 设置初始当前颜色
        if (colors.length > 0) {
          setFocusState(prev => ({
            ...prev,
            currentColor: colors[0].color,
            colorProgress: colors.reduce((acc, color) => ({
              ...acc,
              [color.color]: { completed: 0, total: color.total }
            }), {})
          }));
        }
      } catch (error) {
        console.error('Failed to load focus mode data:', error);
        // 重定向到主页面
        window.location.href = '/';
      }
    } else {
      // 没有数据，重定向到主页面
      window.location.href = '/';
    }
  }, []);

  // 计算推荐的下一个区域
  const calculateRecommendedRegion = useCallback(() => {
    if (!mappedPixelData || !focusState.currentColor) return { region: null, cell: null };

    // 获取当前颜色的所有连通区域
    const allRegions = getAllConnectedRegions(mappedPixelData, focusState.currentColor);
    
    // 筛选出未完成的区域
    const incompleteRegions = allRegions.filter(region => 
      !isRegionCompleted(region, focusState.completedCells)
    );

    if (incompleteRegions.length === 0) {
      return { region: null, cell: null };
    }

    let selectedRegion: { row: number; col: number }[];

    // 根据引导模式选择推荐区域
    switch (focusState.guidanceMode) {
      case 'nearest':
        // 找最近的区域（相对于上一个完成的格子或中心点）
        const referencePoint = focusState.selectedCell ?? { 
          row: Math.floor(mappedPixelData.length / 2), 
          col: Math.floor(mappedPixelData[0].length / 2) 
        };
        
        const sortedByDistance = sortRegionsByDistance(incompleteRegions, referencePoint);
        selectedRegion = sortedByDistance[0];
        break;

      case 'largest':
        // 找最大的连通区域
        const sortedBySize = sortRegionsBySize(incompleteRegions);
        selectedRegion = sortedBySize[0];
        break;

      case 'edge-first':
        // 优先选择包含边缘格子的区域
        const M = mappedPixelData.length;
        const N = mappedPixelData[0].length;
        const edgeRegions = incompleteRegions.filter(region => 
          region.some(cell => 
            cell.row === 0 || cell.row === M - 1 ||
            cell.col === 0 || cell.col === N - 1
          )
        );
        
        if (edgeRegions.length > 0) {
          selectedRegion = edgeRegions[0];
        } else {
          selectedRegion = incompleteRegions[0];
        }
        break;

      default:
        selectedRegion = incompleteRegions[0];
    }

    // 计算区域中心作为推荐显示位置
    const centerCell = getRegionCenter(selectedRegion);
    
    return { 
      region: selectedRegion, 
      cell: centerCell 
    };
  }, [mappedPixelData, focusState.currentColor, focusState.completedCells, focusState.selectedCell, focusState.guidanceMode]);

  // 更新推荐区域
  useEffect(() => {
    const { region, cell } = calculateRecommendedRegion();
    setFocusState(prev => ({ 
      ...prev, 
      recommendedRegion: region,
      recommendedCell: cell 
    }));
  }, [calculateRecommendedRegion]);

  // 处理格子点击 - 改为区域洪水填充标记
  const handleCellClick = useCallback((row: number, col: number) => {
    if (!mappedPixelData) return;

    const cellColor = mappedPixelData[row][col].color;

    // 如果点击的是当前颜色的格子，对整个连通区域进行标记
    if (cellColor === focusState.currentColor) {
      // 获取点击位置的连通区域
      const region = getConnectedRegion(mappedPixelData, row, col, focusState.currentColor);
      
      if (region.length === 0) return;

      const newCompletedCells = new Set(focusState.completedCells);
      
      // 检查区域是否已完成
      const isCurrentlyCompleted = isRegionCompleted(region, focusState.completedCells);
      
      if (isCurrentlyCompleted) {
        // 如果区域已完成，取消整个区域的完成状态
        region.forEach(({ row: r, col: c }) => {
          newCompletedCells.delete(`${r},${c}`);
        });
      } else {
        // 如果区域未完成，标记整个区域为完成
        region.forEach(({ row: r, col: c }) => {
          newCompletedCells.add(`${r},${c}`);
        });
      }

      // 更新进度
      const newColorProgress = { ...focusState.colorProgress };
      if (newColorProgress[focusState.currentColor]) {
        newColorProgress[focusState.currentColor].completed = Array.from(newCompletedCells)
          .filter(key => {
            const [r, c] = key.split(',').map(Number);
            return mappedPixelData[r]?.[c]?.color === focusState.currentColor;
          }).length;
      }

      setFocusState(prev => ({
        ...prev,
        completedCells: newCompletedCells,
        selectedCell: { row, col },
        colorProgress: newColorProgress
      }));

      // 更新可用颜色的完成数
      setAvailableColors(prev => prev.map(color => {
        if (color.color === focusState.currentColor) {
          return {
            ...color,
            completed: newColorProgress[focusState.currentColor]?.completed || 0
          };
        }
        return color;
      }));
    }
  }, [mappedPixelData, focusState.currentColor, focusState.completedCells, focusState.colorProgress]);

  // 处理颜色切换
  const handleColorChange = useCallback((color: string) => {
    setFocusState(prev => ({ ...prev, currentColor: color, showColorPanel: false }));
  }, []);

  // 处理定位到推荐位置
  const handleLocateRecommended = useCallback(() => {
    if (focusState.recommendedCell) {
      // 计算需要的偏移量使推荐格子居中
      const { row, col } = focusState.recommendedCell;
      // 这里简化处理，实际需要根据画布尺寸计算
      setFocusState(prev => ({
        ...prev,
        canvasOffset: { x: -col * 20, y: -row * 20 } // 假设每个格子20px
      }));
    }
  }, [focusState.recommendedCell]);

  if (!mappedPixelData || !gridDimensions) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  const currentColorInfo = availableColors.find(c => c.color === focusState.currentColor);
  const progressPercentage = currentColorInfo ? 
    Math.round((currentColorInfo.completed / currentColorInfo.total) * 100) : 0;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="h-15 bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 className="text-lg font-medium text-gray-800">专心拼豆（AlphaTest）</h1>
        <button 
          onClick={() => setFocusState(prev => ({ ...prev, showSettingsPanel: true }))}
          className="text-gray-600 hover:text-gray-800"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      {/* 当前颜色状态栏 */}
      <ColorStatusBar 
        currentColor={focusState.currentColor}
        colorInfo={currentColorInfo}
        progressPercentage={progressPercentage}
      />

      {/* 主画布区域 */}
      <div className="flex-1 relative overflow-hidden">
        <FocusCanvas
          mappedPixelData={mappedPixelData}
          gridDimensions={gridDimensions}
          currentColor={focusState.currentColor}
          completedCells={focusState.completedCells}
          recommendedCell={focusState.recommendedCell}
          recommendedRegion={focusState.recommendedRegion}
          canvasScale={focusState.canvasScale}
          canvasOffset={focusState.canvasOffset}
          onCellClick={handleCellClick}
          onScaleChange={(scale: number) => setFocusState(prev => ({ ...prev, canvasScale: scale }))}
          onOffsetChange={(offset: { x: number; y: number }) => setFocusState(prev => ({ ...prev, canvasOffset: offset }))}
        />
      </div>

      {/* 快速进度条 */}
      <ProgressBar 
        progressPercentage={progressPercentage}
        recommendedCell={focusState.recommendedCell}
        colorInfo={currentColorInfo}
      />

      {/* 底部工具栏 */}
      <ToolBar 
        onColorSelect={() => setFocusState(prev => ({ ...prev, showColorPanel: true }))}
        onLocate={handleLocateRecommended}
        onUndo={() => {/* TODO: 实现撤销功能 */}}
        onPause={() => setFocusState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
        isPaused={focusState.isPaused}
      />

      {/* 颜色选择面板 */}
      {focusState.showColorPanel && (
        <ColorPanel
          colors={availableColors}
          currentColor={focusState.currentColor}
          onColorSelect={handleColorChange}
          onClose={() => setFocusState(prev => ({ ...prev, showColorPanel: false }))}
        />
      )}

      {/* 设置面板 */}
      {focusState.showSettingsPanel && (
        <SettingsPanel
          guidanceMode={focusState.guidanceMode}
          onGuidanceModeChange={(mode: 'nearest' | 'largest' | 'edge-first') => setFocusState(prev => ({ ...prev, guidanceMode: mode }))}
          onClose={() => setFocusState(prev => ({ ...prev, showSettingsPanel: false }))}
        />
      )}
    </div>
  );
}