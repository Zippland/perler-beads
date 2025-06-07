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
import CelebrationAnimation from '../../components/CelebrationAnimation';
import CompletionCard from '../../components/CompletionCard';
import { getColorKeyByHex, ColorSystem } from '../../utils/colorSystemUtils';

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
  
  // 计时器状态
  startTime: number; // 开始时间戳
  totalElapsedTime: number; // 总计用时（秒）
  lastResumeTime: number; // 最后一次恢复的时间戳
  
  // 显示设置
  gridSectionInterval: number; // 网格分区间隔
  showSectionLines: boolean; // 是否显示分割线
  sectionLineColor: string; // 分割线颜色
  enableCelebration: boolean; // 是否启用庆祝动画
  showCelebration: boolean; // 是否显示庆祝动画
  showCompletionCard: boolean; // 是否显示完成打卡图
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
    isPaused: false,
    startTime: Date.now(),
    totalElapsedTime: 0,
    lastResumeTime: Date.now(),
    gridSectionInterval: 10,
    showSectionLines: true,
    sectionLineColor: '#007acc',
    enableCelebration: true,
    showCelebration: false,
    showCompletionCard: false
  });

  // 可用颜色列表
  const [availableColors, setAvailableColors] = useState<Array<{
    color: string;
    name: string;
    total: number;
    completed: number;
  }>>([]);

  // 计时器管理
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (!focusState.isPaused) {
      interval = setInterval(() => {
        setFocusState(prev => {
          const now = Date.now();
          const elapsed = Math.floor((now - prev.lastResumeTime) / 1000);
          return {
            ...prev,
            totalElapsedTime: prev.totalElapsedTime + elapsed,
            lastResumeTime: now
          };
        });
      }, 1000); // 每秒更新一次
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [focusState.isPaused]);

  // 从localStorage加载数据
  useEffect(() => {
    const savedPixelData = localStorage.getItem('focusMode_pixelData');
    const savedGridDimensions = localStorage.getItem('focusMode_gridDimensions');
    const savedColorCounts = localStorage.getItem('focusMode_colorCounts');
    const savedColorSystem = localStorage.getItem('focusMode_selectedColorSystem');

    if (savedPixelData && savedGridDimensions && savedColorCounts) {
      try {
        const pixelData = JSON.parse(savedPixelData);
        const dimensions = JSON.parse(savedGridDimensions);
        const colorCounts = JSON.parse(savedColorCounts);

        setMappedPixelData(pixelData);
        setGridDimensions(dimensions);
        
        // 设置色号系统 - 已移除未使用的状态

        // 计算颜色进度
        const colors = Object.entries(colorCounts).map(([, colorData]) => {
          const data = colorData as { color: string; count: number };
          // 通过hex值获取对应色号系统的色号
          const displayKey = getColorKeyByHex(data.color, savedColorSystem as ColorSystem || 'MARD');
          return {
            color: data.color,
            name: displayKey, // 使用色号系统的色号作为名称
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
      let colorJustCompleted = false;
      
      if (newColorProgress[focusState.currentColor]) {
        const oldCompleted = newColorProgress[focusState.currentColor].completed;
        const newCompleted = Array.from(newCompletedCells)
          .filter(key => {
            const [r, c] = key.split(',').map(Number);
            return mappedPixelData[r]?.[c]?.color === focusState.currentColor;
          }).length;
        
        newColorProgress[focusState.currentColor].completed = newCompleted;
        
        // 检测颜色是否刚刚完成
        const total = newColorProgress[focusState.currentColor].total;
        if (oldCompleted < total && newCompleted === total && focusState.enableCelebration) {
          colorJustCompleted = true;
        }
      }

      // 检查是否所有颜色都完成了（包括当前刚完成的颜色）
      const allColorsCompleted = Object.values(newColorProgress).every(
        progress => progress.completed >= progress.total
      );

      setFocusState(prev => {
        const now = Date.now();
        let newState = {
          ...prev,
          completedCells: newCompletedCells,
          selectedCell: { row, col },
          colorProgress: newColorProgress,
          showCelebration: colorJustCompleted
        };

        // 如果所有颜色都完成了，停止计时
        if (allColorsCompleted && !prev.isPaused) {
          const elapsed = Math.floor((now - prev.lastResumeTime) / 1000);
          newState = {
            ...newState,
            isPaused: true,
            totalElapsedTime: prev.totalElapsedTime + elapsed
          };
        }

        return newState;
      });

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
  }, [mappedPixelData, focusState.currentColor, focusState.completedCells, focusState.colorProgress, focusState.enableCelebration]);

  // 处理颜色切换
  const handleColorChange = useCallback((color: string) => {
    setFocusState(prev => ({ ...prev, currentColor: color, showColorPanel: false }));
  }, []);

  // 处理定位到推荐位置
  const handleLocateRecommended = useCallback(() => {
    if (!focusState.recommendedCell || !gridDimensions) return;
    
    const { row, col } = focusState.recommendedCell;
    
    // 计算格子大小（与FocusCanvas中的计算保持一致）
    const cellSize = Math.max(15, Math.min(40, 300 / Math.max(gridDimensions.N, gridDimensions.M)));
    
    // 计算目标格子在画布上的中心位置（像素坐标）
    const targetX = (col + 0.5) * cellSize;
    const targetY = (row + 0.5) * cellSize;
    
    // 计算画布总尺寸
    const canvasWidth = gridDimensions.N * cellSize;
    const canvasHeight = gridDimensions.M * cellSize;
    
    // 简单的定位逻辑：
    // 1. 将目标位置移到画布的中心位置
    // 2. 考虑缩放的影响
    
    // 画布中心位置
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;
    
    // 计算从目标位置到画布中心的偏移量
    const offsetX = canvasCenterX - targetX;
    const offsetY = canvasCenterY - targetY;
    
    // 更新状态
    setFocusState(prev => ({
      ...prev,
      canvasOffset: { x: offsetX, y: offsetY }
    }));
  }, [focusState.recommendedCell, gridDimensions]);

  // 格式化时间显示
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }, []);

  // 处理暂停/继续
  const handlePauseToggle = useCallback(() => {
    setFocusState(prev => {
      const now = Date.now();
      if (prev.isPaused) {
        // 从暂停恢复：重新设置恢复时间
        return {
          ...prev,
          isPaused: false,
          lastResumeTime: now
        };
      } else {
        // 暂停：累加当前的时间段到总时间
        const elapsed = Math.floor((now - prev.lastResumeTime) / 1000);
        return {
          ...prev,
          isPaused: true,
          totalElapsedTime: prev.totalElapsedTime + elapsed
        };
      }
    });
  }, []);

  // 处理庆祝动画完成
  const handleCelebrationComplete = useCallback(() => {
    setFocusState(prev => ({ ...prev, showCelebration: false }));
    
    // 检查是否所有颜色都完成了
    const allCompleted = availableColors.every(color => color.completed >= color.total);
    
    if (allCompleted) {
      // 所有颜色都完成了，显示打卡图
      setFocusState(prev => ({ ...prev, showCompletionCard: true }));
    } else {
      // 查找下一个未完成的颜色
      const currentIndex = availableColors.findIndex(color => color.color === focusState.currentColor);
      if (currentIndex !== -1) {
        // 从当前颜色的下一个开始寻找未完成的颜色
        for (let i = 1; i < availableColors.length; i++) {
          const nextIndex = (currentIndex + i) % availableColors.length;
          const nextColor = availableColors[nextIndex];
          
          // 如果找到未完成的颜色，切换到该颜色
          if (nextColor.completed < nextColor.total) {
            setFocusState(prev => ({ ...prev, currentColor: nextColor.color }));
            break;
          }
        }
      }
    }
  }, [availableColors, focusState.currentColor]);

  // 处理打卡图关闭
  const handleCompletionCardClose = useCallback(() => {
    setFocusState(prev => ({ ...prev, showCompletionCard: false }));
  }, []);

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
          gridSectionInterval={focusState.gridSectionInterval}
          showSectionLines={focusState.showSectionLines}
          sectionLineColor={focusState.sectionLineColor}
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
        onPause={handlePauseToggle}
        isPaused={focusState.isPaused}
        elapsedTime={formatTime(focusState.totalElapsedTime)}
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
          gridSectionInterval={focusState.gridSectionInterval}
          onGridSectionIntervalChange={(interval: number) => setFocusState(prev => ({ ...prev, gridSectionInterval: interval }))}
          showSectionLines={focusState.showSectionLines}
          onShowSectionLinesChange={(show: boolean) => setFocusState(prev => ({ ...prev, showSectionLines: show }))}
          sectionLineColor={focusState.sectionLineColor}
          onSectionLineColorChange={(color: string) => setFocusState(prev => ({ ...prev, sectionLineColor: color }))}
          enableCelebration={focusState.enableCelebration}
          onEnableCelebrationChange={(enable: boolean) => setFocusState(prev => ({ ...prev, enableCelebration: enable }))}
          onClose={() => setFocusState(prev => ({ ...prev, showSettingsPanel: false }))}
        />
      )}

      {/* 庆祝动画 */}
      <CelebrationAnimation
        isVisible={focusState.showCelebration}
        onComplete={handleCelebrationComplete}
      />

      {/* 完成打卡图 */}
      <CompletionCard
        isVisible={focusState.showCompletionCard}
        mappedPixelData={mappedPixelData}
        gridDimensions={gridDimensions}
        totalElapsedTime={focusState.totalElapsedTime}
        onClose={handleCompletionCardClose}
      />
    </div>
  );
}