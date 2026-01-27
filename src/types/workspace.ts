import { MappedPixel, PixelationMode, PaletteColor } from '../utils/pixelation';
import { ColorSystem } from '../utils/colorSystemUtils';
import { PaletteSelections } from '../utils/localStorageUtils';
import { GridDownloadOptions } from './downloadTypes';

// 工作区模式
export type WorkspaceMode = 'preview' | 'edit' | 'focus';

// 工具类型
export type ToolType = 'brush' | 'eraser' | 'fill' | 'eyedropper' | 'magnifier';

// 颜色替换状态
export interface ColorReplaceState {
  isActive: boolean;
  step: 'select-source' | 'select-target';
  sourceColor?: { key: string; color: string };
}

// 放大镜选区
export interface MagnifierArea {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

// Tooltip 数据
export interface TooltipData {
  x: number;
  y: number;
  key: string;
  color: string;
}

// 颜色统计
export interface ColorStats {
  [key: string]: { count: number; color: string };
}

// 工作区状态
export interface WorkspaceState {
  // 模式
  mode: WorkspaceMode;

  // 图像数据
  originalImageSrc: string | null;
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;

  // 处理设置
  granularity: number;
  similarityThreshold: number;
  pixelationMode: PixelationMode;

  // 颜色系统
  selectedColorSystem: ColorSystem;
  activeBeadPalette: PaletteColor[];
  customPaletteSelections: PaletteSelections;
  excludedColorKeys: Set<string>;
  initialGridColorKeys: Set<string>;

  // 颜色统计
  colorCounts: ColorStats | null;
  totalBeadCount: number;

  // 下载设置
  downloadOptions: GridDownloadOptions;
}

// 编辑状态
export interface EditState {
  // 手动着色模式
  isManualColoringMode: boolean;
  selectedColor: MappedPixel | null;

  // 工具状态
  selectedTool: ToolType;
  isEraseMode: boolean;

  // 颜色替换
  colorReplaceState: ColorReplaceState;

  // 放大镜
  isMagnifierActive: boolean;
  magnifierArea: MagnifierArea | null;

  // 高亮
  highlightColorKey: string | null;

  // 浮动面板
  isFloatingPaletteOpen: boolean;
  showFullPalette: boolean;
  activeFloatingTool: 'palette' | 'magnifier' | null;
}

// UI 状态
export interface UIState {
  // Tooltip
  tooltipData: TooltipData | null;

  // 弹窗
  isDownloadSettingsOpen: boolean;
  isCustomPaletteEditorOpen: boolean;
  isDonationModalOpen: boolean;
  isFocusModePreDownloadModalOpen: boolean;

  // 显示控制
  showExcludedColors: boolean;
  isCustomPalette: boolean;

  // 挂载状态
  isMounted: boolean;
}

// 专注模式状态
export interface FocusState {
  // 当前颜色
  currentColor: string | null;

  // 完成进度
  completedCells: Set<string>;
  colorProgress: { [colorKey: string]: { completed: number; total: number } };

  // 引导模式
  guidanceMode: 'nearest' | 'largest' | 'edge';

  // 计时
  isPaused: boolean;
  elapsedTime: number;

  // 设置
  gridSectionInterval: number;
  showSectionLines: boolean;
}

// Context Actions - 工作区
export interface WorkspaceActions {
  setMode: (mode: WorkspaceMode) => void;
  setOriginalImageSrc: (src: string | null) => void;
  setMappedPixelData: (data: MappedPixel[][] | null) => void;
  setGridDimensions: (dimensions: { N: number; M: number } | null) => void;
  setGranularity: (value: number) => void;
  setSimilarityThreshold: (value: number) => void;
  setPixelationMode: (mode: PixelationMode) => void;
  setSelectedColorSystem: (system: ColorSystem) => void;
  setActiveBeadPalette: (palette: PaletteColor[]) => void;
  setCustomPaletteSelections: (selections: PaletteSelections) => void;
  setExcludedColorKeys: (keys: Set<string>) => void;
  setInitialGridColorKeys: (keys: Set<string>) => void;
  setColorCounts: (counts: ColorStats | null) => void;
  setTotalBeadCount: (count: number) => void;
  setDownloadOptions: (options: GridDownloadOptions) => void;
}

// Context Actions - 编辑
export interface EditActions {
  setIsManualColoringMode: (isManual: boolean) => void;
  setSelectedColor: (color: MappedPixel | null) => void;
  setSelectedTool: (tool: ToolType) => void;
  setIsEraseMode: (isErase: boolean) => void;
  setColorReplaceState: (state: ColorReplaceState) => void;
  setIsMagnifierActive: (isActive: boolean) => void;
  setMagnifierArea: (area: MagnifierArea | null) => void;
  setHighlightColorKey: (key: string | null) => void;
  setIsFloatingPaletteOpen: (isOpen: boolean) => void;
  setShowFullPalette: (show: boolean) => void;
  setActiveFloatingTool: (tool: 'palette' | 'magnifier' | null) => void;
}

// Context Actions - UI
export interface UIActions {
  setTooltipData: (data: TooltipData | null) => void;
  setIsDownloadSettingsOpen: (isOpen: boolean) => void;
  setIsCustomPaletteEditorOpen: (isOpen: boolean) => void;
  setIsDonationModalOpen: (isOpen: boolean) => void;
  setIsFocusModePreDownloadModalOpen: (isOpen: boolean) => void;
  setShowExcludedColors: (show: boolean) => void;
  setIsCustomPalette: (isCustom: boolean) => void;
}

// Context Actions - 专注模式
export interface FocusActions {
  setCurrentColor: (color: string | null) => void;
  toggleCellCompletion: (cellKey: string) => void;
  setGuidanceMode: (mode: 'nearest' | 'largest' | 'edge') => void;
  togglePause: () => void;
  resetProgress: () => void;
  setGridSectionInterval: (interval: number) => void;
  setShowSectionLines: (show: boolean) => void;
}
