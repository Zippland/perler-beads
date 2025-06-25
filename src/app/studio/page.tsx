'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MappedPixel, 
  PixelationMode,
  calculatePixelGrid,
  PaletteColor,
  hexToRgb,
  RgbColor,
  colorDistance
} from '../../utils/pixelation';
import { 
  getAllConnectedRegions, 
  isRegionCompleted, 
  getRegionCenter, 
  sortRegionsByDistance, 
  sortRegionsBySize,
  getConnectedRegion
} from '../../utils/floodFillUtils';
import UnifiedCanvas from '../../components/UnifiedCanvas';
import ColorStatusBar from '../../components/ColorStatusBar';
import ProgressBar from '../../components/ProgressBar';
import ToolBar from '../../components/ToolBar';
import ColorPanel from '../../components/ColorPanel';
import SettingsPanel from '../../components/SettingsPanel';
import CelebrationAnimation from '../../components/CelebrationAnimation';
import CompletionCard from '../../components/CompletionCard';
import PreviewToolbar from '../../components/PreviewToolbar';
import EditToolbar from '../../components/EditToolbar';
import ColorSystemPanel from '../../components/ColorSystemPanel';
import { getColorKeyByHex, ColorSystem, getMardToHexMapping, getAllHexValues } from '../../utils/colorSystemUtils';

// 定义编辑模式类型
type EditMode = 'focus' | 'preview' | 'edit';

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
  
  // 模式
  editMode: EditMode;
}


export default function FocusMode() {
  const router = useRouter();
  
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
    showCompletionCard: false,
    editMode: 'preview'  // 默认为预览模式
  });

  // 可用颜色列表
  const [availableColors, setAvailableColors] = useState<Array<{
    color: string;
    name: string;
    total: number;
    completed: number;
  }>>([]);
  
  // 预览模式状态
  const [gridWidth, setGridWidth] = useState<number>(100); // 默认100格子宽度
  const [colorMergeThreshold, setColorMergeThreshold] = useState<number>(30); // 颜色合并阈值，默认30
  const [pixelationMode, setPixelationMode] = useState<PixelationMode>(PixelationMode.Dominant);
  const [removeBackground, setRemoveBackground] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // 色号系统和点击格子颜色信息的状态
  const [selectedColorSystem, setSelectedColorSystem] = useState<ColorSystem>('MARD');
  const [clickedCellColor, setClickedCellColor] = useState<{ hex: string; key: string } | null>(null);
  const [showColorSystemPanel, setShowColorSystemPanel] = useState(false);
  const [customPalette, setCustomPalette] = useState<Set<string>>(new Set(getAllHexValues()));
  
  // 编辑模式状态
  const [editTool, setEditTool] = useState<'select' | 'wand'>('select');
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [history, setHistory] = useState<MappedPixel[][][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // 计算状态
  const hasSelection = selectedCells.size > 0;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 在客户端加载保存的设置
  useEffect(() => {
    // 加载色号系统
    const savedColorSystem = localStorage.getItem('selectedColorSystem');
    if (savedColorSystem) {
      setSelectedColorSystem(savedColorSystem as ColorSystem);
    }
    
    // 加载自定义色板
    const savedPalette = localStorage.getItem('customPalette');
    if (savedPalette) {
      try {
        const palette = new Set<string>(JSON.parse(savedPalette));
        setCustomPalette(palette);
      } catch (e) {
        console.error('Failed to load custom palette:', e);
      }
    }
  }, []);

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

  // 处理上传的图片
  useEffect(() => {
    // 先检查是否有上传的图片
    const uploadedImage = localStorage.getItem('uploadedImage');
    if (uploadedImage) {
      // 清除上传的图片，避免重复处理
      localStorage.removeItem('uploadedImage');
      
      // 生成像素画
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // 固定宽度为100格子，高度按比例计算
        const N = 100; // N是横向（宽度），固定100格子
        const aspectRatio = img.height / img.width;
        const M = Math.round(N * aspectRatio); // M是纵向（高度），按比例计算

        // 根据自定义色板构建可用颜色
        const activeBeadPalette: PaletteColor[] = Array.from(customPalette)
          .map(hex => {
            const rgb = hexToRgb(hex);
            if (!rgb) return null;
            return { key: hex, hex, rgb };
          })
          .filter((color): color is PaletteColor => color !== null);

        // 获取备用颜色
        const fallbackColor = activeBeadPalette[0] || { key: '#000000', hex: '#000000', rgb: { r: 0, g: 0, b: 0 } };

        // 计算像素网格
        const pixelData = calculatePixelGrid(
          ctx,
          img.width,
          img.height,
          N,
          M,
          activeBeadPalette,
          PixelationMode.Dominant,
          fallbackColor
        );

        // 计算颜色统计
        const counts: { [key: string]: { count: number; color: string } } = {};
        pixelData.forEach(row => {
          row.forEach(pixel => {
            if (pixel.key && pixel.key !== 'transparent' && !pixel.isExternal) {
              if (!counts[pixel.key]) {
                counts[pixel.key] = { count: 0, color: pixel.color };
              }
              counts[pixel.key].count++;
            }
          });
        });

        // 保存到专心模式的 localStorage
        localStorage.setItem('focusMode_pixelData', JSON.stringify(pixelData));
        localStorage.setItem('focusMode_gridDimensions', JSON.stringify({ N, M }));
        localStorage.setItem('focusMode_colorCounts', JSON.stringify(counts));
        localStorage.setItem('focusMode_selectedColorSystem', 'MARD');
        localStorage.setItem('focusMode_originalImage', uploadedImage); // 保存原始图片

        // 设置状态
        setMappedPixelData(pixelData);
        setGridDimensions({ N, M });

        // 计算颜色进度
        const colors = Object.entries(counts).map(([, colorData]) => {
          const displayKey = getColorKeyByHex(colorData.color, 'MARD');
          return {
            color: colorData.color,
            name: displayKey,
            total: colorData.count,
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
          // 预览模式也设置初始颜色
          setSelectedColor(colors[0].color);
        }
      };
      img.src = uploadedImage;
      return; // 如果有上传的图片，就不再检查保存的数据
    }

    // 从localStorage加载数据
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
          // 预览模式也设置初始颜色
          setSelectedColor(colors[0].color);
        }
      } catch (error) {
        console.error('Failed to load focus mode data:', error);
        // 重定向到主页面
        router.push('/');
      }
    } else {
      // 没有数据，重定向到主页面
      router.push('/');
    }
  }, [router]);

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

  // 处理格子点击 - 根据不同模式执行不同操作
  const handleCellClick = useCallback((row: number, col: number) => {
    if (!mappedPixelData) return;

    const cellColor = mappedPixelData[row][col].color;
    const pixel = mappedPixelData[row][col];
    
    // 更新点击的格子颜色信息（所有模式下都执行）
    if (!pixel.isExternal && pixel.key !== 'transparent') {
      const colorKey = getColorKeyByHex(cellColor, selectedColorSystem);
      setClickedCellColor({ hex: cellColor, key: colorKey });
    } else {
      setClickedCellColor(null);
    }
    
    // 专心模式：标记区域
    if (focusState.editMode === 'focus' && cellColor === focusState.currentColor) {
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
    
    // 预览模式：不处理点击
    if (focusState.editMode === 'preview') {
      return;
    }
    
    // 编辑模式：处理选择
    if (focusState.editMode === 'edit') {
      if (editTool === 'select') {
        // 矩形选择
        if (!isSelecting) {
          // 开始选择
          setIsSelecting(true);
          setSelectionStart({ row, col });
          setSelectedCells(new Set([`${row},${col}`]));
        }
      } else if (editTool === 'wand') {
        // 魔棒选择（选择相同颜色的连通区域）
        const targetColor = cellColor;
        const visited = new Set<string>();
        const toVisit = [`${row},${col}`];
        const newSelection = new Set<string>();
        
        while (toVisit.length > 0) {
          const current = toVisit.pop()!;
          if (visited.has(current)) continue;
          visited.add(current);
          
          const [r, c] = current.split(',').map(Number);
          if (r < 0 || r >= mappedPixelData.length || c < 0 || c >= mappedPixelData[0].length) continue;
          
          if (mappedPixelData[r][c].color === targetColor) {
            newSelection.add(current);
            
            // 添加相邻格子
            toVisit.push(`${r-1},${c}`, `${r+1},${c}`, `${r},${c-1}`, `${r},${c+1}`);
          }
        }
        
        setSelectedCells(newSelection);
      }
    }
  }, [mappedPixelData, focusState, editTool, isSelecting, selectedColorSystem]);

  // 处理颜色切换
  const handleColorChange = useCallback((color: string) => {
    setFocusState(prev => ({ ...prev, currentColor: color, showColorPanel: false }));
  }, []);

  // 处理定位到推荐位置
  const handleLocateRecommended = useCallback(() => {
    if (!focusState.recommendedCell || !gridDimensions) return;
    
    const { row, col } = focusState.recommendedCell;
    
    // 计算格子大小（与UnifiedCanvas中的计算保持一致）
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
  
  // 重新生成像素画
  const regeneratePixelArt = useCallback(() => {
    // 获取原始图片
    const imageSrc = localStorage.getItem('focusMode_originalImage') || localStorage.getItem('uploadedImage');
    if (!imageSrc) return;
    
    setIsProcessing(true);
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // 使用新的参数生成，确保在合法范围内
      let N = gridWidth; // N是横向（宽度）
      // 确保N在合法范围内
      if (N < 10) N = 10;
      if (N > 300) N = 300;
      
      const aspectRatio = img.height / img.width;
      const M = Math.round(N * aspectRatio); // M是纵向（高度）

      // 根据自定义色板构建可用颜色
      const activeBeadPalette: PaletteColor[] = Array.from(customPalette)
        .map(hex => {
          const rgb = hexToRgb(hex);
          if (!rgb) return null;
          return { key: hex, hex, rgb };
        })
        .filter((color): color is PaletteColor => color !== null);

      // 获取备用颜色
      const fallbackColor = activeBeadPalette[0] || { key: '#000000', hex: '#000000', rgb: { r: 0, g: 0, b: 0 } };

      // 计算像素网格
      const pixelData = calculatePixelGrid(
        ctx,
        img.width,
        img.height,
        N,
        M,
        activeBeadPalette,
        pixelationMode,
        fallbackColor
      );

      // 实现颜色合并功能
      // 确保阈值在合法范围内
      let mergeThreshold = colorMergeThreshold;
      if (mergeThreshold < 0) mergeThreshold = 0;
      if (mergeThreshold > 450) mergeThreshold = 450;
      
      if (mergeThreshold > 0) {
        // 首先统计所有颜色的使用次数
        const colorCounts: { [key: string]: { count: number; rgb: RgbColor } } = {};
        
        pixelData.forEach(row => {
          row.forEach(pixel => {
            if (pixel.key && pixel.key !== 'transparent' && !pixel.isExternal) {
              if (!colorCounts[pixel.color]) {
                const rgb = hexToRgb(pixel.color);
                if (rgb) {
                  colorCounts[pixel.color] = { count: 0, rgb };
                }
              }
              if (colorCounts[pixel.color]) {
                colorCounts[pixel.color].count++;
              }
            }
          });
        });
        
        // 按数量从多到少排序
        const sortedColors = Object.entries(colorCounts)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([color, data]) => ({ color, ...data }));
        
        // 创建颜色映射表
        const colorMap: { [key: string]: string } = {};
        
        // 从数量最多的颜色开始遍历
        sortedColors.forEach((colorA, index) => {
          // 如果这个颜色已经被合并到其他颜色，跳过
          if (colorMap[colorA.color]) return;
          
          // 将自己映射到自己
          colorMap[colorA.color] = colorA.color;
          
          // 检查后面的颜色是否可以合并到这个颜色
          for (let j = index + 1; j < sortedColors.length; j++) {
            const colorB = sortedColors[j];
            
            // 如果颜色B已经被合并，跳过
            if (colorMap[colorB.color]) continue;
            
            // 计算两个颜色的距离
            const distance = colorDistance(colorA.rgb, colorB.rgb);
            
            // 如果距离小于阈值，将B合并到A
            if (distance < mergeThreshold) {
              colorMap[colorB.color] = colorA.color;
            }
          }
        });
        
        // 应用颜色映射
        pixelData.forEach(row => {
          row.forEach(pixel => {
            if (pixel.color && colorMap[pixel.color]) {
              pixel.color = colorMap[pixel.color];
              pixel.key = colorMap[pixel.color];
            }
          });
        });
      }
      
      // 实现去背景功能
      if (removeBackground) {
        const rows = pixelData.length;
        const cols = pixelData[0]?.length || 0;
        
        // 统计边缘颜色
        const edgeColorCounts: { [key: string]: number } = {};
        
        // 统计上边缘
        for (let x = 0; x < cols; x++) {
          const color = pixelData[0][x].color;
          if (color && color !== 'transparent') {
            edgeColorCounts[color] = (edgeColorCounts[color] || 0) + 1;
          }
        }
        
        // 统计下边缘
        for (let x = 0; x < cols; x++) {
          const color = pixelData[rows - 1][x].color;
          if (color && color !== 'transparent') {
            edgeColorCounts[color] = (edgeColorCounts[color] || 0) + 1;
          }
        }
        
        // 统计左边缘（排除角落避免重复计数）
        for (let y = 1; y < rows - 1; y++) {
          const color = pixelData[y][0].color;
          if (color && color !== 'transparent') {
            edgeColorCounts[color] = (edgeColorCounts[color] || 0) + 1;
          }
        }
        
        // 统计右边缘（排除角落避免重复计数）
        for (let y = 1; y < rows - 1; y++) {
          const color = pixelData[y][cols - 1].color;
          if (color && color !== 'transparent') {
            edgeColorCounts[color] = (edgeColorCounts[color] || 0) + 1;
          }
        }
        
        // 找出边缘最多的颜色
        let mostCommonEdgeColor = '';
        let maxCount = 0;
        for (const [color, count] of Object.entries(edgeColorCounts)) {
          if (count > maxCount) {
            maxCount = count;
            mostCommonEdgeColor = color;
          }
        }
        
        // 如果找到了最常见的边缘颜色，进行洪水填充
        if (mostCommonEdgeColor) {
          // 洪水填充函数
          const floodFill = (startY: number, startX: number, targetColor: string) => {
            const visited = new Set<string>();
            const queue: [number, number][] = [[startY, startX]];
            
            while (queue.length > 0) {
              const [y, x] = queue.shift()!;
              const key = `${y},${x}`;
              
              // 检查边界和是否已访问
              if (y < 0 || y >= rows || x < 0 || x >= cols || visited.has(key)) {
                continue;
              }
              
              visited.add(key);
              
              // 检查颜色是否匹配
              if (pixelData[y][x].color !== targetColor) {
                continue;
              }
              
              // 标记为外部（背景）
              pixelData[y][x].isExternal = true;
              
              // 添加相邻像素到队列
              queue.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
            }
          };
          
          // 从所有边缘开始洪水填充
          // 上边缘
          for (let x = 0; x < cols; x++) {
            if (pixelData[0][x].color === mostCommonEdgeColor && !pixelData[0][x].isExternal) {
              floodFill(0, x, mostCommonEdgeColor);
            }
          }
          
          // 下边缘
          for (let x = 0; x < cols; x++) {
            if (pixelData[rows - 1][x].color === mostCommonEdgeColor && !pixelData[rows - 1][x].isExternal) {
              floodFill(rows - 1, x, mostCommonEdgeColor);
            }
          }
          
          // 左边缘
          for (let y = 0; y < rows; y++) {
            if (pixelData[y][0].color === mostCommonEdgeColor && !pixelData[y][0].isExternal) {
              floodFill(y, 0, mostCommonEdgeColor);
            }
          }
          
          // 右边缘
          for (let y = 0; y < rows; y++) {
            if (pixelData[y][cols - 1].color === mostCommonEdgeColor && !pixelData[y][cols - 1].isExternal) {
              floodFill(y, cols - 1, mostCommonEdgeColor);
            }
          }
        }
      }

      // 计算颜色统计
      const counts: { [key: string]: { count: number; color: string } } = {};
      pixelData.forEach(row => {
        row.forEach(pixel => {
          if (pixel.key && pixel.key !== 'transparent' && !pixel.isExternal) {
            if (!counts[pixel.key]) {
              counts[pixel.key] = { count: 0, color: pixel.color };
            }
            counts[pixel.key].count++;
          }
        });
      });

      // 更新状态
      setMappedPixelData(pixelData);
      setGridDimensions({ N, M });

      // 更新颜色列表
      const colors = Object.entries(counts).map(([, colorData]) => {
        const displayKey = getColorKeyByHex(colorData.color, selectedColorSystem);
        return {
          color: colorData.color,
          name: displayKey,
          total: colorData.count,
          completed: 0
        };
      });
      setAvailableColors(colors);

      // 如果没有选中颜色，选择第一个
      if (!selectedColor && colors.length > 0) {
        setSelectedColor(colors[0].color);
      }

      setIsProcessing(false);
    };
    img.src = imageSrc;
  }, [gridWidth, pixelationMode, colorMergeThreshold, removeBackground, selectedColor, selectedColorSystem, customPalette]);
  
  // 编辑模式：保存历史记录
  const saveToHistory = useCallback(() => {
    if (!mappedPixelData) return;
    
    // 如果不在历史末尾，删除后面的历史
    const newHistory = history.slice(0, historyIndex + 1);
    
    // 深拷贝当前状态
    const currentState = mappedPixelData.map(row => row.map(pixel => ({ ...pixel })));
    
    // 添加到历史
    newHistory.push(currentState);
    
    // 限制历史记录数量
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [mappedPixelData, history, historyIndex]);
  
  // 编辑模式：撤销
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMappedPixelData(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);
  
  // 编辑模式：重做
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMappedPixelData(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);
  
  // 编辑模式：执行操作
  const handleEditOperation = useCallback((operation: 'fill' | 'clear' | 'invert') => {
    if (!mappedPixelData) return;
    
    saveToHistory();
    
    const newPixelData = mappedPixelData.map(row => row.map(pixel => ({ ...pixel })));
    
    if (operation === 'fill' && selectedColor) {
      // 填充选中区域
      selectedCells.forEach(cellKey => {
        const [row, col] = cellKey.split(',').map(Number);
        if (newPixelData[row] && newPixelData[row][col]) {
          newPixelData[row][col] = {
            ...newPixelData[row][col],
            color: selectedColor,
            key: selectedColor
          };
        }
      });
    } else if (operation === 'clear') {
      // 清除选中区域
      selectedCells.forEach(cellKey => {
        const [row, col] = cellKey.split(',').map(Number);
        if (newPixelData[row] && newPixelData[row][col]) {
          newPixelData[row][col] = {
            ...newPixelData[row][col],
            color: 'transparent',
            key: 'transparent'
          };
        }
      });
    } else if (operation === 'invert') {
      // 反选
      const newSelection = new Set<string>();
      for (let row = 0; row < newPixelData.length; row++) {
        for (let col = 0; col < newPixelData[row].length; col++) {
          const cellKey = `${row},${col}`;
          if (!selectedCells.has(cellKey)) {
            newSelection.add(cellKey);
          }
        }
      }
      setSelectedCells(newSelection);
      return; // 反选不修改像素数据
    }
    
    setMappedPixelData(newPixelData);
  }, [mappedPixelData, selectedColor, selectedCells, saveToHistory]);
  
  // 编辑模式：处理鼠标悬停（用于矩形选择）
  const handleCellHover = useCallback((row: number, col: number) => {
    if (!isSelecting || !selectionStart) return;
    
    // 计算矩形选择区域
    const minRow = Math.min(selectionStart.row, row);
    const maxRow = Math.max(selectionStart.row, row);
    const minCol = Math.min(selectionStart.col, col);
    const maxCol = Math.max(selectionStart.col, col);
    
    const newSelection = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        newSelection.add(`${r},${c}`);
      }
    }
    
    setSelectedCells(newSelection);
  }, [isSelecting, selectionStart]);
  
  // 编辑模式：结束选择
  const handleSelectionEnd = useCallback(() => {
    setIsSelecting(false);
  }, []);
  
  // 监听 pixelationMode 变化并重新生成
  useEffect(() => {
    // 只有在有图片数据时才重新生成
    if (mappedPixelData && focusState.editMode === 'preview') {
      regeneratePixelArt();
    }
  }, [pixelationMode]); // 只监听 pixelationMode 的变化
  
  // 监听 removeBackground 变化并重新生成
  useEffect(() => {
    // 只有在有图片数据时才重新生成
    if (mappedPixelData && focusState.editMode === 'preview') {
      regeneratePixelArt();
    }
  }, [removeBackground]); // 只监听 removeBackground 的变化
  
  // 当色号系统改变时，更新所有颜色的名称
  useEffect(() => {
    if (availableColors.length > 0 && !isProcessing) {
      setAvailableColors(prev => prev.map(color => ({
        ...color,
        name: getColorKeyByHex(color.color, selectedColorSystem)
      })));
    }
  }, [selectedColorSystem]);

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
      {/* 顶部导航栏 - 移动端优化 */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-3 py-2 flex items-center justify-between">
        <button 
          onClick={() => window.history.back()}
          className="p-2 -ml-2 text-gray-600 active:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Logo 位置预留 */}
        <div className="flex-1 flex items-center justify-center">
          {/* TODO: 添加 Logo */}
        </div>
        
        {/* 色板系统选择 */}
        <button
          onClick={() => setShowColorSystemPanel(true)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium mr-2"
        >
          {selectedColorSystem} ▼
        </button>
        
        <button 
          onClick={() => setFocusState(prev => ({ ...prev, showSettingsPanel: true }))}
          className="p-2 -mr-2 text-gray-600 active:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
      </header>
      
      {/* 状态信息栏 - 显示颜色数量和像素尺寸 */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-1.5 flex items-center justify-between">
        <div className="text-sm text-gray-700 font-mono tracking-wide">
          <span className="font-medium">{availableColors.length}色</span>
          <span className="mx-3 text-gray-400">|</span>
          <span className="font-medium">{mappedPixelData ? `${mappedPixelData[0]?.length || 0}×${mappedPixelData.length}` : '0×0'}</span>
        </div>
        {/* 点击格子的颜色信息 */}
        {clickedCellColor && (
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
            <div 
              className="w-5 h-5 rounded border border-gray-300"
              style={{ backgroundColor: clickedCellColor.hex }}
            />
            <span className="text-sm font-medium text-gray-700">
              {clickedCellColor.key}
            </span>
          </div>
        )}
      </div>

      {/* 当前颜色状态栏 - 仅在专心模式显示 */}
      {focusState.editMode === 'focus' && (
        <ColorStatusBar 
          currentColor={focusState.currentColor}
          colorInfo={currentColorInfo}
          progressPercentage={progressPercentage}
        />
      )}

      {/* 主画布区域 */}
      <div className="flex-1 relative overflow-hidden">
        <UnifiedCanvas
          mappedPixelData={mappedPixelData}
          gridDimensions={gridDimensions}
          currentColor={focusState.editMode === 'focus' ? focusState.currentColor : selectedColor}
          completedCells={focusState.editMode === 'focus' ? focusState.completedCells : new Set()}
          recommendedCell={focusState.editMode === 'focus' ? focusState.recommendedCell : null}
          recommendedRegion={focusState.editMode === 'focus' ? focusState.recommendedRegion : null}
          canvasScale={focusState.canvasScale}
          canvasOffset={focusState.canvasOffset}
          gridSectionInterval={focusState.gridSectionInterval}
          showSectionLines={focusState.showSectionLines}
          sectionLineColor={focusState.sectionLineColor}
          onCellClick={handleCellClick}
          onScaleChange={(scale: number) => setFocusState(prev => ({ ...prev, canvasScale: scale }))}
          onOffsetChange={(offset: { x: number; y: number }) => setFocusState(prev => ({ ...prev, canvasOffset: offset }))}
          highlightColor={null}
          editMode={focusState.editMode}
          selectedCells={focusState.editMode === 'edit' ? selectedCells : null}
          onCellHover={focusState.editMode === 'edit' && isSelecting ? handleCellHover : undefined}
          onSelectionEnd={focusState.editMode === 'edit' ? handleSelectionEnd : undefined}
        />
      </div>

      {/* 快速进度条 - 仅在专心模式显示 */}
      {focusState.editMode === 'focus' && (
        <ProgressBar 
          progressPercentage={progressPercentage}
          recommendedCell={focusState.recommendedCell}
          colorInfo={currentColorInfo}
        />
      )}

      {/* 底部工具栏 - 根据模式显示不同内容 */}
      {focusState.editMode === 'focus' && (
        <ToolBar 
          onColorSelect={() => setFocusState(prev => ({ ...prev, showColorPanel: true }))}
          onLocate={handleLocateRecommended}
          onPause={handlePauseToggle}
          isPaused={focusState.isPaused}
          elapsedTime={formatTime(focusState.totalElapsedTime)}
        />
      )}
      
      {/* 预览模式工具栏 */}
      {focusState.editMode === 'preview' && (
        <PreviewToolbar
          gridWidth={gridWidth}
          colorMergeThreshold={colorMergeThreshold}
          pixelationMode={pixelationMode}
          removeBackground={removeBackground}
          availableColors={availableColors}
          mappedPixelData={mappedPixelData}
          isProcessing={isProcessing}
          onGridWidthChange={setGridWidth}
          onColorMergeThresholdChange={setColorMergeThreshold}
          onPixelationModeChange={setPixelationMode}
          onRemoveBackgroundChange={setRemoveBackground}
          onRegenerate={regeneratePixelArt}
        />
      )}
      
      {/* 编辑模式工具栏 */}
      {focusState.editMode === 'edit' && (
        <EditToolbar
          editTool={editTool}
          hasSelection={hasSelection}
          canUndo={canUndo}
          canRedo={canRedo}
          selectedColor={selectedColor}
          availableColors={availableColors}
          selectedCells={selectedCells}
          onEditToolChange={setEditTool}
          onEditOperation={handleEditOperation}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onColorSelect={setSelectedColor}
          onShowColorPanel={() => setFocusState(prev => ({ ...prev, showColorPanel: true }))}
        />
      )}
      
      {/* 底部模式切换栏 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex bg-gray-100 rounded-lg p-1 max-w-md mx-auto">
          <button
            onClick={() => setFocusState(prev => ({ ...prev, editMode: 'preview' }))}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              focusState.editMode === 'preview'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            预览
          </button>
          <button
            onClick={() => setFocusState(prev => ({ ...prev, editMode: 'edit' }))}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              focusState.editMode === 'edit'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            编辑
          </button>
          <button
            onClick={() => setFocusState(prev => ({ ...prev, editMode: 'focus' }))}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              focusState.editMode === 'focus'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            专心
          </button>
        </div>
      </div>

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

      {/* 色板系统面板 */}
      {showColorSystemPanel && (
        <ColorSystemPanel
          selectedColorSystem={selectedColorSystem}
          customPalette={customPalette}
          onColorSystemChange={setSelectedColorSystem}
          onCustomPaletteChange={setCustomPalette}
          onClose={() => setShowColorSystemPanel(false)}
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
      
      {/* 处理中提示 */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg font-medium">处理中...</span>
          </div>
        </div>
      )}
    </div>
  );
}